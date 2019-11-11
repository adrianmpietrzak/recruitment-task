import 'normalize.css';

import './styles/global.scss';

const createElement = ({ tag, text, classes, attributes }) => {
  const element = document.createElement(tag);
  text ? (element.innerText = text) : null;
  classes ? element.classList.add(...classes) : null;
  attributes ? attributes.map(attribute => element.setAttribute(attribute.type, attribute.value)) : null;

  return element;
};

class Form {
  constructor({ formSelector, formLoaderSeletor, thumbnailsSelector, basketSelector, popupSelector, apiUrl, apiKey }) {
    this.form = document.querySelector(formSelector);
    this.formLoader = document.querySelector(formLoaderSeletor);
    this.thumbnailsWrapper = document.querySelector(thumbnailsSelector);
    this.basketWrapper = document.querySelector(basketSelector);
    this.popupWrapper = document.querySelector(popupSelector);
    this.apiUrl = apiUrl;
    this.apiKey = apiKey;

    this.dateList = this.form.querySelector('#dates');
    this.roversList = this.form.querySelector('#rovers');
    this.camerasList = this.form.querySelector('#cameras');

    this.dates = this.dateList.querySelectorAll('input');
    this.cameras = this.camerasList.querySelectorAll('input');

    this.roversApi = `${this.apiUrl}/rovers?api_key=${this.apiKey}`;

    this.rovers = [];
    this.roversAvailableCameras = [];
    this.selectedRoversCameras = [];

    this.startDate = null;
    this.endDate = null;
    this.dateRange = [];
    this.selectedRovers = [];
    this.selectedCameras = [];

    this.results = [];
    this.resultsGrid = null;

    this._init();
  }

  _init() {
    this._getRoversElements();

    [...this.cameras].map(camera => {
      camera.addEventListener('change', () => {
        const cameraName = camera.getAttribute('name');
        camera.checked
          ? this.selectedCameras.push(cameraName)
          : (this.selectedCameras = this.selectedCameras.filter(name => name !== cameraName));
      });
    });

    [...this.dates].map((date, index) =>
      date.addEventListener('change', () => {
        this[date.name] = this._formatDate(new Date(date.value));
        if (index === 0) {
          this.dates[1].setAttribute('min', this[date.name]);
        } else {
          this.dates[0].setAttribute('max', this[date.name]);
        }
        if (this.startDate && this.endDate) {
          this._getRoversAvailableDates();
        }
      })
    );

    this.form.addEventListener('submit', event => {
      event.preventDefault();

      this.thumbnailsWrapper.classList.remove('hidden');

      this.results = [];
      this.dateRange = [];

      this._getDateRange();
      this._getResults();
    });
  }

  _formatDate(date) {
    const year = date.getFullYear();
    const month = date.getMonth() < 9 ? `0${date.getMonth() + 1}` : date.getMonth() + 1;
    const day = date.getDate() < 9 ? `0${date.getDate()}` : date.getDate();
    return `${year}-${month}-${day}`;
  }

  _getDateRange() {
    const startDate = new Date(this.dates[0].value);
    const endDate = new Date(this.dates[1].value);

    Date.prototype.addDays = function(days) {
      const date = new Date(this.valueOf());
      date.setDate(date.getDate() + days);
      return date;
    };

    const getDates = (startDate, stopDate) => {
      let currentDate = startDate;

      while (currentDate <= stopDate) {
        const date = new Date(currentDate);
        const formattedDate = this._formatDate(date);
        this.dateRange.push(formattedDate);
        currentDate = currentDate.addDays(1);
      }
    };

    return getDates(startDate, endDate);
  }

  _createRequestPromise(url, localRoverResults, date, rover) {
    return new Promise((resolve, reject) =>
      fetch(url)
        .then(res => res.json())
        .then(json => {
          localRoverResults.push({ date, results: json.photos });
          localStorage.setItem(rover, JSON.stringify(localRoverResults));

          const filteredPhotos = json.photos.filter(photo => this.selectedCameras.includes(photo.camera.name));
          this.results.push(...filteredPhotos);

          resolve();
        })
        .catch(err => reject(err))
    );
  }

  _getResults() {
    const requests = [];
    this.selectedRovers.map(rover => {
      const localRoverResults = JSON.parse(localStorage.getItem(rover)) || [];

      this.dateRange.some(date => {
        let isLocal = false;
        if (localRoverResults.length > 0) {
          localRoverResults.some(result => {
            if (result.date === date) {
              isLocal = true;
              return true;
            }
          });
        }

        if (isLocal) {
          const photos = JSON.parse(localStorage.getItem(rover)).filter(photo => photo.date === date);
          const filteredPhotos = photos[0].results.filter(photo => this.selectedCameras.includes(photo.camera.name));

          this.results.push(...filteredPhotos);
        } else {
          const url = `${this.apiUrl}/rovers/${rover}/photos?earth_date=${date}&api_key=${this.apiKey}`;
          const request = this._createRequestPromise(url, localRoverResults, date, rover);

          requests.push(request);
        }
      });
    });
    this.resultsGrid = null;

    Promise.all(requests).then(() => this._showResults());
  }

  _showResults() {
    if (this.results.length > 0) {
      this.resultsGrid = new ResultsGrid({
        results: this.results,
        thumbnailsWrapper: this.thumbnailsWrapper,
        basketWrapper: this.basketWrapper,
        popupWrapper: this.popupWrapper
      });
    }
  }

  _checkUncheckInput(input, check, classes) {
    input.disabled = !check;
    !check ? (input.checked = false) : null;
    input.classList[check ? 'remove' : 'add']([...classes]);
  }

  _getRoversAvailableDates() {
    const rovers = this.roversList.querySelectorAll('input');
    [...rovers].map(rover => {
      const roverMinDate = rover.getAttribute('data-min');
      const roverMaxDate = rover.getAttribute('data-max');

      if (this.endDate < roverMinDate || this.startDate > roverMaxDate) {
        this._checkUncheckInput(rover, false, ['rover--disabled']);

        this.selectedRovers = this.selectedRovers.filter(selectedRover => selectedRover !== rover.name);
        this._getAvailableCameraToSelectedRovers();
      } else {
        this._checkUncheckInput(rover, true, ['rover--disabled']);
      }
    });
  }

  _getRoverAvailableCamera() {
    this.rovers.map(rover => {
      this.roversAvailableCameras.push({
        name: rover.name,
        availableCameras: rover.cameras.map(camera => camera.name)
      });
    });
  }

  _changeRoverCamerasAvailability() {
    [...this.cameras].map(camera =>
      this._checkUncheckInput(camera, this.selectedRoversCameras.includes(camera.name) ? true : false, ['camera--disabled'])
    );
  }

  _getAvailableCameraToSelectedRovers() {
    const roversCameras = this.roversAvailableCameras.filter(rover => this.selectedRovers.includes(rover.name.toLowerCase()));
    const selectedRoversCameras = [];
    roversCameras.map(rover => {
      selectedRoversCameras.push(...rover.availableCameras);
    });

    this.selectedRoversCameras = [...new Set(selectedRoversCameras)];
    this._changeRoverCamerasAvailability();
  }

  _createRoversElements(rovers) {
    rovers.map(rover => {
      // API returns name format example => "name": "Curiosity"
      const roverName = rover.name.replace('"', '');
      const roverID = roverName.replace(' ', '-').toLowerCase();

      const roverItem = createElement({ tag: 'li' });
      const roverInput = createElement({
        tag: 'input',
        attributes: [
          { type: 'type', value: 'checkbox' },
          { type: 'id', value: roverID },
          { type: 'name', value: roverID },
          { type: 'disabled', value: 'true' },
          { type: 'data-min', value: rover.landing_date },
          { type: 'data-max', value: rover.max_date }
        ]
      });

      roverInput.addEventListener('change', () => {
        roverInput.checked
          ? this.selectedRovers.push(roverID)
          : (this.selectedRovers = this.selectedRovers.filter(name => name !== roverID));
        this._getAvailableCameraToSelectedRovers();
      });

      const roverLabel = createElement({
        tag: 'label',
        text: roverName,
        attributes: [{ type: 'for', value: roverID }]
      });

      roverItem.appendChild(roverInput);
      roverItem.appendChild(roverLabel);
      this.roversList.appendChild(roverItem);
    });
  }

  async _getRoversElements() {
    if (localStorage.getItem('rovers')) {
      const rovers = JSON.parse(localStorage.getItem('rovers'));
      this._createRoversElements(rovers);
      this.rovers = rovers;
    } else {
      await fetch(this.roversApi)
        .then(res => res.json())
        .then(json => {
          localStorage.setItem('rovers', JSON.stringify(json.rovers));
          this._createRoversElements(json.rovers);
          this.rovers = json.rovers;
        });
    }

    this.roversAvailableCameras.length === 0 ? this._getRoverAvailableCamera() : null;

    this.formLoader.classList.add('hidden');
    this.form.classList.remove('hidden');
  }
}

class ResultsGrid {
  constructor({ results, thumbnailsWrapper, basketWrapper, popupWrapper }) {
    this.results = results;
    this.thumbnailsWrapper = thumbnailsWrapper;
    this.thumbnails = [];
    this.basketThumbnailIndexes = [];

    this.popupWrapper = popupWrapper;
    this.basketWrapper = basketWrapper;

    this.basket = new Basket({ wrapper: this.basketWrapper });
    this.popup = new Popup({ wrapper: this.popupWrapper });

    this._init();
  }

  _init() {
    this.thumbnailsWrapper.classList.remove('loader');
    this.results.map((result, resultIndex) => {
      this._createThumbnail(result, resultIndex);
    });

    this.thumbnails.map(thumbnail => {
      this.thumbnailsWrapper.appendChild(thumbnail);
    });
  }

  _thumbnailImageClickListener(thumbnailIndex) {
    this.popup.createPopupContent(this.thumbnails, thumbnailIndex, this.basket);
    this.popup.show();
  }

  _createThumbnail(result, resultIndex) {
    const thumbnail = createElement({
      tag: 'div',
      classes: ['thumbnail'],
      attributes: [{ type: 'data-image', value: result.img_src }]
    });

    const thumbnailImage = createElement({
      tag: 'img',
      classes: ['thumbnail__image', 'loader']
    });

    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          thumbnailImage.setAttribute('src', result.img_src);
          thumbnailImage.onload = () => thumbnailImage.classList.remove('loader');
          observer.disconnect();
        }
      });
    });

    imageObserver.observe(thumbnailImage);

    thumbnailImage.addEventListener('click', () => this._thumbnailImageClickListener(resultIndex));

    const thumbnailDescription = createElement({
      tag: 'div',
      classes: ['thumbnail__description']
    });

    const dateTaken = createElement({
      tag: 'span',
      text: result.earth_date,
      classes: ['thumbnail__date']
    });

    const roverName = createElement({
      tag: 'span',
      text: result.rover.name,
      classes: ['thumbnail__rover']
    });

    thumbnailDescription.appendChild(dateTaken);
    thumbnailDescription.appendChild(roverName);

    thumbnail.appendChild(thumbnailImage);
    thumbnail.appendChild(thumbnailDescription);

    this.thumbnails.push(thumbnail);
  }
}

class Popup {
  constructor({ wrapper }) {
    this.wrapper = wrapper;
  }

  show() {
    this.wrapper.classList.remove('hidden');

    this.wrapper.addEventListener('click', () => {
      this.wrapper.innerHTML = '';
      this.wrapper.classList.add('hidden');
    });
  }

  createPopupContent(thumbnails, index, basket) {
    const clonedThumbnail = thumbnails[index].cloneNode(true);
    clonedThumbnail.classList.add('thumbnail--popup');

    const thumbnailAddToBasket = createElement({
      tag: 'div',
      classes: ['thumbnail__basket']
    });

    const thumbnailAddToBasketBtn = createElement({
      tag: 'button',
      text: 'Add to basket',
      classes: ['thumbnail__basket-btn']
    });

    thumbnailAddToBasketBtn.addEventListener('click', () => basket.createBasketThumbnail(thumbnails, index));

    thumbnailAddToBasket.appendChild(thumbnailAddToBasketBtn);
    clonedThumbnail.appendChild(thumbnailAddToBasket);

    this.wrapper.appendChild(clonedThumbnail);

    clonedThumbnail.addEventListener('click', event => event.stopPropagation());
  }
}

class Basket {
  constructor({ wrapper }) {
    this.wrapper = wrapper;
    this.startGrid = this.wrapper.querySelector('#start-grid');
    this.basket = [];
    this.basketThumbnailIndexes = [];

    this.imageGrid = null;
    this.imageGridUrls = [];

    this._init();
  }

  _init() {
    this.startGrid.addEventListener('click', () => {
      this.imageGridUrls = [];
      [...this.basket].map(thumbnail => {
        this.imageGridUrls.push(thumbnail.getAttribute('data-image'));
      });
      this.imageGrid = new ImageGrid({ imagesUrls: this.imageGridUrls });
      this.basket = [];
    });
  }

  _checkStartGridAvailability() {
    this.wrapper.classList[this.basketThumbnailIndexes.length > 0 ? 'remove' : 'add']('hidden');
    this.startGrid[this.basketThumbnailIndexes.length >= 1 ? 'removeAttribute' : 'setAttribute']('disabled', 'true');
  }

  _changePositionUp(element) {
    element.previousElementSibling !== null ? this.wrapper.insertBefore(element, element.previousElementSibling) : null;
  }

  _changePositionDown(element) {
    element.nextElementSibling !== null && element.nextElementSibling !== this.startGrid
      ? element.parentNode.insertBefore(element, element.nextSibling.nextSibling)
      : null;
  }

  _deleteElement(element, thumbnailIndex) {
    [...this.wrapper.children].map(child => (child === element ? child.remove() : null));
    this.basketThumbnailIndexes = this.basketThumbnailIndexes.filter(index => index !== thumbnailIndex);
    this.basket = this.basket.filter(basketElement => basketElement !== element);
    this._checkStartGridAvailability();
  }

  createBasketThumbnail(thumbnails, thumbnailIndex) {
    if (!this.basketThumbnailIndexes.includes(thumbnailIndex)) {
      const basketThumbnail = thumbnails[thumbnailIndex].cloneNode(true);
      basketThumbnail.classList.add('thumbnail--basket');

      const basketThumbnailControls = createElement({
        tag: 'div',
        classes: ['basket-controls']
      });

      const basketThumbnailControlsUp = createElement({
        tag: 'span',
        text: '↑',
        classes: ['basket-controls__up']
      });

      basketThumbnailControlsUp.addEventListener('click', () => this._changePositionUp(basketThumbnail));

      const basketThumbnailControlsDown = createElement({
        tag: 'span',
        text: '↓',
        classes: ['basket-controls__down']
      });

      basketThumbnailControlsDown.addEventListener('click', () => this._changePositionDown(basketThumbnail));

      const basketThumbnailControlsDelete = createElement({
        tag: 'span',
        text: '-',
        classes: ['basket-controls__delete']
      });

      basketThumbnailControlsDelete.addEventListener('click', () => this._deleteElement(basketThumbnail, thumbnailIndex));

      basketThumbnailControls.appendChild(basketThumbnailControlsUp);
      basketThumbnailControls.appendChild(basketThumbnailControlsDown);
      basketThumbnailControls.appendChild(basketThumbnailControlsDelete);

      basketThumbnail.appendChild(basketThumbnailControls);
      this.wrapper.insertBefore(basketThumbnail, this.startGrid);
      this.basketThumbnailIndexes.push(thumbnailIndex);
      this.basket.push(basketThumbnail);

      this._checkStartGridAvailability();
    }
  }
}

class ImageGrid {
  constructor({ imagesUrls }) {
    this.imagesUrls = imagesUrls;
    this.uniqueImagesLength = this.imagesUrls.length;
    this.fillImageList = [];
    this.imageGrid = document.querySelector('#image-popup');

    this._init();
  }

  _init() {
    this.imageGrid.innerHTML = '';

    const amountOfImages = Math.floor(window.innerHeight / 100) * Math.floor(window.innerWidth / 100);
    let index = 0;

    for (let i = 0; i < amountOfImages; i++) {
      const img = this._createImage(this.imagesUrls[index]);
      this.fillImageList.push(img);
      this.imageGrid.appendChild(img);

      index + 1 <= this.uniqueImagesLength - 1 ? index++ : (index = 0);
    }

    this.imageGrid.classList.remove('hidden');

    this._rotateImages();
  }

  _createImage(imageUrl) {
    const image = createElement({
      tag: 'img',
      classes: ['image-grid__image'],
      attributes: [{ type: 'src', value: imageUrl }]
    });

    return image;
  }

  _rotateImages() {
    setInterval(() => {
      const flipOutRandomImage = this.fillImageList[Math.floor(Math.random() * this.fillImageList.length)];
      const flipInRandomImageUrl = this.imagesUrls[Math.floor(Math.random() * this.imagesUrls.length)];
      flipOutRandomImage.classList.remove('flip-in');
      flipOutRandomImage.classList.add('flip-out');
      setTimeout(() => {
        flipOutRandomImage.classList.remove('flip-out');
        flipOutRandomImage.classList.add('flip-in');
        flipOutRandomImage.setAttribute('src', flipInRandomImageUrl);
      }, 2000);
    }, 4000);
  }
}

new Form({
  formSelector: '#search-form',
  formLoaderSeletor: '#form-loader',
  thumbnailsSelector: '#thumbnails',
  basketSelector: '#basket',
  popupSelector: '#thumbnail-popup',
  apiUrl: process.env.API_URL,
  apiKey: process.env.API_KEY
});
