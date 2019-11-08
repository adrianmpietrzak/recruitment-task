import './styles/global.scss';

const apiUrl = process.env.API_URL;
const apiKey = process.env.API_KEY;

console.log(`${apiUrl}/rovers?api_key=${apiKey}`);

class Form {
  constructor({ form, formLoader, dateList, roversList, camerasList }) {
    this.form = document.querySelector(form);
    this.formLoader = document.querySelector(formLoader);

    this.dateList = this.form.querySelector(dateList);
    this.roversList = this.form.querySelector(roversList);
    this.camerasList = this.form.querySelector(camerasList);

    this.dates = this.dateList.querySelectorAll('input');
    this.cameras = this.camerasList.querySelectorAll('input');

    this.roversApi = `${apiUrl}/rovers?api_key=${apiKey}`;

    this.rovers = [];
    this.roversAvailableCameras = [];
    this.selectedRoversCameras = [];

    this.startDate = null;
    this.endDate = null;
    this.dateRange = [];
    this.selectedRovers = [];
    this.selectedCameras = [];

    this.results = [];

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
        // console.log(currentDate);
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
          const url = `${apiUrl}/rovers/${rover}/photos?earth_date=${date}&api_key=${apiKey}`;
          const request = this._createRequestPromise(url, localRoverResults, date, rover);

          requests.push(request);
        }
      });
    });

    Promise.all(requests).then(() => this._showResults());
  }

  _showResults() {
    console.log('this.results = ', this.results);
  }

  _createElement({ tag, text, classes, attributes }) {
    const element = document.createElement(tag);
    text ? (element.innerText = text) : null;
    classes ? element.classList.add(classes) : null;
    attributes ? attributes.map(attribute => element.setAttribute(attribute.type, attribute.value)) : null;

    return element;
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

      const roverItem = this._createElement({ tag: 'li' });
      const roverInput = this._createElement({
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

      const roverLabel = this._createElement({
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

const form = new Form({
  form: '#search-form',
  formLoader: '#form-loader',
  dateList: '#dates',
  roversList: '#rovers',
  camerasList: '#cameras'
});
console.log(form);
