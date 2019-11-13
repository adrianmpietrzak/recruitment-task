import ImageGrid from "./image-grid";
import { createElement } from "./helpers";

export default class Basket {
  constructor({ wrapper }) {
    this.wrapper = wrapper;
    this.startGrid = this.wrapper.querySelector("#start-grid");
    this.removeAll = this.wrapper.querySelector("#remove-all");
    this.basket = [];
    this.basketThumbnailIndexes = [];

    this.imageGrid = null;
    this.imageGridUrls = [];

    this._init();
  }

  _init() {
    this.startGrid.addEventListener("click", () => {
      this.imageGridUrls = [];
      [...this.basket].map(thumbnail => {
        this.imageGridUrls.push(thumbnail.getAttribute("data-image"));
      });
      this.imageGrid = new ImageGrid({ imagesUrls: this.imageGridUrls });
      // this.basket = [];
    });

    this.removeAll.addEventListener("click", () => {
      this.basket.map(() => {
        [...this.wrapper.children].map(child =>
          child.nodeName !== "BUTTON" ? child.remove() : null
        );
        this.basket = [];
        this.basketThumbnailIndexes = [];
      });
    });
  }

  _checkStartGridAvailability() {
    this.wrapper.classList[
      this.basketThumbnailIndexes.length > 0 ? "remove" : "add"
    ]("hidden");
    this.startGrid[
      this.basketThumbnailIndexes.length >= 10
        ? "removeAttribute"
        : "setAttribute"
    ]("disabled", "true");
    this.removeAll[
      this.basketThumbnailIndexes.length >= 1
        ? "removeAttribute"
        : "setAttribute"
    ]("disabled", "true");
  }

  _changePositionUp(element) {
    // element.previousElementSibling !== null ? this.wrapper.insertBefore(element, element.previousElementSibling) : null;
    element.previousElementSibling.nodeName === "DIV"
      ? this.wrapper.insertBefore(element, element.previousElementSibling)
      : null;
  }

  _changePositionDown(element) {
    element.nextElementSibling !== null &&
    element.nextElementSibling !== this.startGrid
      ? element.parentNode.insertBefore(
          element,
          element.nextSibling.nextSibling
        )
      : null;
  }

  _deleteElement(element, thumbnailIndex) {
    [...this.wrapper.children].map(child =>
      child === element ? child.remove() : null
    );
    this.basketThumbnailIndexes = this.basketThumbnailIndexes.filter(
      index => index !== thumbnailIndex
    );
    this.basket = this.basket.filter(
      basketElement => basketElement !== element
    );
    this._checkStartGridAvailability();
  }

  createBasketThumbnail(thumbnails, thumbnailIndex) {
    let addCondition = false;
    this.basket.map(thumbnail => {
      if (
        thumbnail.getAttribute("data-image") ===
        thumbnails[thumbnailIndex].getAttribute("data-image")
      ) {
        addCondition = true;
      }
    });
    if (!addCondition) {
      const basketThumbnail = thumbnails[thumbnailIndex].cloneNode(true);
      basketThumbnail.classList.add("thumbnail--basket");

      const basketThumbnailControls = createElement({
        tag: "div",
        classes: ["basket-controls"]
      });

      const basketThumbnailControlsUp = createElement({
        tag: "span",
        text: "↑",
        classes: ["basket-controls__up"]
      });

      basketThumbnailControlsUp.addEventListener("click", () =>
        this._changePositionUp(basketThumbnail)
      );

      const basketThumbnailControlsDown = createElement({
        tag: "span",
        text: "↓",
        classes: ["basket-controls__down"]
      });

      basketThumbnailControlsDown.addEventListener("click", () =>
        this._changePositionDown(basketThumbnail)
      );

      const basketThumbnailControlsDelete = createElement({
        tag: "span",
        text: "-",
        classes: ["basket-controls__delete"]
      });

      basketThumbnailControlsDelete.addEventListener("click", () =>
        this._deleteElement(basketThumbnail, thumbnailIndex)
      );

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
