import { createElement } from "./helpers";

export default class ImageGrid {
  constructor({ imagesUrls }) {
    this.imagesUrls = imagesUrls;
    this.uniqueImagesLength = this.imagesUrls.length;
    this.fillImageList = [];
    this.imageGrid = document.querySelector("#image-popup");

    this._init();
  }

  _init() {
    this.imageGrid.innerHTML = "";

    const amountOfImages =
      Math.floor(window.innerHeight / 100) *
      Math.floor(document.body.clientWidth / 100);
    let index = 0;

    for (let i = 0; i < amountOfImages; i++) {
      const img = this._createImage(this.imagesUrls[index]);
      this.fillImageList.push(img);
      this.imageGrid.appendChild(img);

      index + 1 <= this.uniqueImagesLength - 1 ? index++ : (index = 0);
    }

    this.imageGrid.classList.remove("hidden");

    this._rotateImages();
  }

  _createImage(imageUrl) {
    const image = createElement({
      tag: "img",
      classes: ["image-grid__image"],
      attributes: [{ type: "src", value: imageUrl }]
    });

    return image;
  }

  _rotateImages() {
    setInterval(() => {
      const flipOutRandomImage = this.fillImageList[
        Math.floor(Math.random() * this.fillImageList.length)
      ];
      const flipInRandomImageUrl = this.imagesUrls[
        Math.floor(Math.random() * this.imagesUrls.length)
      ];
      flipOutRandomImage.classList.remove("flip-in");
      flipOutRandomImage.classList.add("flip-out");
      setTimeout(() => {
        flipOutRandomImage.classList.remove("flip-out");
        flipOutRandomImage.classList.add("flip-in");
        flipOutRandomImage.setAttribute("src", flipInRandomImageUrl);
      }, 2000);
    }, 4000);
  }
}
