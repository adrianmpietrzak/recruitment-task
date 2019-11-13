import Basket from "./basket";
import Popup from "./popup";
import { createElement } from "./helpers";

export default class ResultsGrid {
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
    this.thumbnailsWrapper.classList.remove("loader");
    const title = createElement({
      tag: "h2",
      text: "Results",
      classes: ["section-title"]
    });
    this.thumbnailsWrapper.appendChild(title);
    this.results.map((result, resultIndex) => {
      this._createThumbnail(result, resultIndex);
    });

    this.thumbnails.map(thumbnail => {
      this.thumbnailsWrapper.appendChild(thumbnail);
    });
  }

  reinit() {
    this.thumbnails = [];
    this.thumbnailsWrapper.innerHTML = "";
    this._init();
  }

  _thumbnailImageClickListener(thumbnailIndex) {
    this.popup.createPopupContent(this.thumbnails, thumbnailIndex, this.basket);
    this.popup.show();
  }

  _createThumbnail(result, resultIndex) {
    const thumbnail = createElement({
      tag: "div",
      classes: ["thumbnail"],
      attributes: [{ type: "data-image", value: result.img_src }]
    });

    const thumbnailImage = createElement({
      tag: "img",
      classes: ["thumbnail__image", "loader"]
    });

    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          thumbnailImage.setAttribute("src", result.img_src);
          thumbnailImage.onload = () => {
            thumbnailImage.classList.remove("loader");
            thumbnailImage.addEventListener("click", () =>
              this._thumbnailImageClickListener(resultIndex)
            );
          };
          observer.disconnect();
        }
      });
    });

    imageObserver.observe(thumbnailImage);

    const thumbnailDescription = createElement({
      tag: "div",
      classes: ["thumbnail__description"]
    });

    const dateTaken = createElement({
      tag: "span",
      text: result.earth_date,
      classes: ["thumbnail__date"]
    });

    const roverName = createElement({
      tag: "span",
      text: result.rover.name,
      classes: ["thumbnail__rover"]
    });

    thumbnailDescription.appendChild(dateTaken);
    thumbnailDescription.appendChild(roverName);

    thumbnail.appendChild(thumbnailImage);
    thumbnail.appendChild(thumbnailDescription);

    this.thumbnails.push(thumbnail);
  }
}
