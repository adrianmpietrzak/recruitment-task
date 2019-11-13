import { createElement } from "./helpers";

export default class Popup {
  constructor({ wrapper }) {
    this.wrapper = wrapper;
  }

  show() {
    this.wrapper.classList.remove("hidden");

    this.wrapper.addEventListener("click", () => {
      this.wrapper.innerHTML = "";
      this.wrapper.classList.add("hidden");
    });
  }

  createPopupContent(thumbnails, index, basket) {
    const clonedThumbnail = thumbnails[index].cloneNode(true);
    clonedThumbnail.classList.add("thumbnail--popup");

    const thumbnailAddToBasket = createElement({
      tag: "div",
      classes: ["thumbnail__basket"]
    });

    const thumbnailAddToBasketBtn = createElement({
      tag: "button",
      text: "Add to basket",
      classes: ["btn"]
    });

    thumbnailAddToBasketBtn.addEventListener("click", () => {
      basket.createBasketThumbnail(thumbnails, index);
    });

    thumbnailAddToBasket.appendChild(thumbnailAddToBasketBtn);
    clonedThumbnail.appendChild(thumbnailAddToBasket);

    this.wrapper.appendChild(clonedThumbnail);

    clonedThumbnail.addEventListener("click", event => event.stopPropagation());
  }
}
