import ResultsGrid from "./results-grid";
import { createElement } from "./helpers";

export default class Form {
  constructor({
    formSelector,
    formLoaderSeletor,
    thumbnailsSelector,
    basketSelector,
    popupSelector,
    apiUrl,
    apiKey
  }) {
    this.form = document.querySelector(formSelector);
    this.formLoader = document.querySelector(formLoaderSeletor);
    this.thumbnailsWrapper = document.querySelector(thumbnailsSelector);
    this.basketWrapper = document.querySelector(basketSelector);
    this.popupWrapper = document.querySelector(popupSelector);
    this.apiUrl = apiUrl;
    this.apiKey = apiKey;

    this.error = this.form.querySelector(".error-message");
    this.dateList = this.form.querySelector("#dates");
    this.roversList = this.form.querySelector("#rovers");
    this.camerasList = this.form.querySelector("#cameras");

    this.dates = this.dateList.querySelectorAll("input");
    this.cameras = this.camerasList.querySelectorAll("input");

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
      camera.addEventListener("change", () => {
        const cameraName = camera.getAttribute("name");
        camera.checked
          ? this.selectedCameras.push(cameraName)
          : (this.selectedCameras = this.selectedCameras.filter(
              name => name !== cameraName
            ));
      });
    });

    [...this.dates].map((date, index) =>
      date.addEventListener("change", () => {
        this[date.name] = this._formatDate(new Date(date.value));
        if (index === 0) {
          this.dates[1].setAttribute("min", this[date.name]);
        } else {
          this.dates[0].setAttribute("max", this[date.name]);
        }
        if (this.startDate && this.endDate) {
          this._getRoversAvailableDates();
        }
      })
    );

    this.form.addEventListener("submit", event => {
      event.preventDefault();

      if (
        this.selectedCameras.length > 0 &&
        this.selectedRovers.length > 0 &&
        this.selectedRoversCameras.length > 0
      ) {
        this.error.classList.add("hidden");
        this.thumbnailsWrapper.classList.remove("hidden");

        this.results = [];
        this.dateRange = [];

        this._getDateRange();
        this._getResults();
      } else {
        this.error.classList.remove("hidden");
      }
    });
  }

  _formatDate(date) {
    const year = date.getFullYear();
    const month =
      date.getMonth() < 9 ? `0${date.getMonth() + 1}` : date.getMonth() + 1;
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

          const filteredPhotos = json.photos.filter(photo =>
            this.selectedCameras.includes(photo.camera.name)
          );
          this.results.push(...filteredPhotos);

          resolve();
        })
        .catch(err => reject(err))
    );
  }

  _getResults() {
    this.thumbnailsWrapper.innerHTML = "";
    this.thumbnailsWrapper.classList.add("loader");
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
          const photos = JSON.parse(localStorage.getItem(rover)).filter(
            photo => photo.date === date
          );
          const filteredPhotos = photos[0].results.filter(photo =>
            this.selectedCameras.includes(photo.camera.name)
          );

          this.results.push(...filteredPhotos);
        } else {
          const url = `${this.apiUrl}/rovers/${rover}/photos?earth_date=${date}&api_key=${this.apiKey}`;
          const request = this._createRequestPromise(
            url,
            localRoverResults,
            date,
            rover
          );

          requests.push(request);
        }
      });
    });

    Promise.all(requests).then(() => this._showResults());
  }

  _showResults() {
    if (this.results.length > 0) {
      if (!this.resultsGrid) {
        this.resultsGrid = new ResultsGrid({
          results: this.results,
          thumbnailsWrapper: this.thumbnailsWrapper,
          basketWrapper: this.basketWrapper,
          popupWrapper: this.popupWrapper
        });
      } else {
        this.resultsGrid.results = this.results;
        this.resultsGrid.reinit();
      }
    } else {
      this.thumbnailsWrapper.classList.remove("loader");
      this.thumbnailsWrapper.innerText = "No results found";
    }
  }

  _checkUncheckInput(input, check, classes) {
    input.disabled = !check;
    !check ? (input.checked = false) : null;
    input.classList[check ? "remove" : "add"]([...classes]);
  }

  _getRoversAvailableDates() {
    const rovers = this.roversList.querySelectorAll("input");
    [...rovers].map(rover => {
      const roverMinDate = rover.getAttribute("data-min");
      const roverMaxDate = rover.getAttribute("data-max");

      if (this.endDate < roverMinDate || this.startDate > roverMaxDate) {
        this._checkUncheckInput(rover, false, ["rover--disabled"]);

        this.selectedRovers = this.selectedRovers.filter(
          selectedRover => selectedRover !== rover.name
        );
        this._getAvailableCameraToSelectedRovers();
      } else {
        this._checkUncheckInput(rover, true, ["rover--disabled"]);
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
      this._checkUncheckInput(
        camera,
        this.selectedRoversCameras.includes(camera.name) ? true : false,
        ["camera--disabled"]
      )
    );
  }

  _getAvailableCameraToSelectedRovers() {
    const roversCameras = this.roversAvailableCameras.filter(rover =>
      this.selectedRovers.includes(rover.name.toLowerCase())
    );
    const selectedRoversCameras = [];
    roversCameras.map(rover => {
      selectedRoversCameras.push(...rover.availableCameras);
    });

    this.selectedRoversCameras = [...new Set(selectedRoversCameras)];
    this._changeRoverCamerasAvailability();
  }

  _createRoverInfoWindow(rover) {
    const roverInfoWrapper = createElement({
      tag: "div",
      text: "?",
      classes: ["tooltip"]
    });

    const roverInfo = createElement({
      tag: "div",
      classes: ["tooltiptext"]
    });

    const roverDates = createElement({
      tag: "ul",
      text: `Avilable date range`,
      classes: ["rover-help__list"]
    });

    const roverStartDate = createElement({
      tag: "li",
      text: `From: ${rover.landing_date}`,
      classes: ["rover-help__item"]
    });

    const roverEndDate = createElement({
      tag: "li",
      text: `To: ${rover.max_date}`,
      classes: ["rover-help__item"]
    });

    const roverCameras = createElement({
      tag: "ul",
      text: `Avilable cameras`,
      classes: ["rover-help__list"]
    });

    rover.cameras.map(camera => {
      if (camera.name !== "ENTRY") {
        const roverCamera = createElement({
          tag: "li",
          text: camera.full_name,
          classes: ["rover-help__item"]
        });
        roverCameras.appendChild(roverCamera);
      }
    });

    roverDates.appendChild(roverStartDate);
    roverDates.appendChild(roverEndDate);
    roverInfo.appendChild(roverDates);
    roverInfo.appendChild(roverCameras);
    roverInfoWrapper.appendChild(roverInfo);

    return roverInfoWrapper;
  }

  _createRoversElements(rovers) {
    rovers.map(rover => {
      // API returns name format example => "name": "Curiosity"
      const roverName = rover.name.replace('"', "");
      const roverID = roverName.replace(" ", "-").toLowerCase();

      const roverItem = createElement({
        tag: "li",
        classes: ["form-entry__list-item"]
      });
      const roverInput = createElement({
        tag: "input",
        attributes: [
          { type: "type", value: "checkbox" },
          { type: "id", value: roverID },
          { type: "name", value: roverID },
          { type: "disabled", value: "true" },
          { type: "data-min", value: rover.landing_date },
          { type: "data-max", value: rover.max_date }
        ]
      });

      roverInput.addEventListener("change", () => {
        roverInput.checked
          ? this.selectedRovers.push(roverID)
          : (this.selectedRovers = this.selectedRovers.filter(
              name => name !== roverID
            ));
        this._getAvailableCameraToSelectedRovers();
      });

      const roverLabel = createElement({
        tag: "label",
        text: roverName,
        attributes: [{ type: "for", value: roverID }],
        classes: ["form-entry__label"]
      });

      const roverInfoWindow = this._createRoverInfoWindow(rover);
      roverLabel.appendChild(roverInfoWindow);

      roverItem.appendChild(roverInput);
      roverItem.appendChild(roverLabel);
      this.roversList.appendChild(roverItem);
    });
  }

  async _getRoversElements() {
    if (localStorage.getItem("rovers")) {
      const rovers = JSON.parse(localStorage.getItem("rovers"));
      this._createRoversElements(rovers);
      this.rovers = rovers;
    } else {
      await fetch(this.roversApi)
        .then(res => res.json())
        .then(json => {
          localStorage.setItem("rovers", JSON.stringify(json.rovers));
          this._createRoversElements(json.rovers);
          this.rovers = json.rovers;
        });
    }

    this.roversAvailableCameras.length === 0
      ? this._getRoverAvailableCamera()
      : null;

    this.formLoader.classList.add("hidden");
    this.form.classList.remove("hidden");
  }
}
