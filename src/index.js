import "normalize.css";
import "./styles/global.scss";

import Form from "./scripts/form";

new Form({
  formSelector: "#search-form",
  formLoaderSeletor: "#form-loader",
  thumbnailsSelector: "#thumbnails",
  basketSelector: "#basket",
  popupSelector: "#thumbnail-popup",
  apiUrl: process.env.API_URL,
  apiKey: process.env.API_KEY
});
