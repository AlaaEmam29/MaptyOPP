"use script";



const currentTimerDom = document.querySelector(".current__timer");
const form = document.querySelector(".form");
const containerWorkouts = document.querySelector(".workouts");
// const workout = document.querySelector(".workout")
const allWorkouts = document.querySelectorAll(".workout")

const inputSelect = document.querySelector(".form__input--select");
const inputDistance = document.querySelector(".form__input--distance");
const inputDuration = document.querySelector(".form__input--duration");
const inputType = document.querySelector(".form__input--type");
const labelType = document.querySelector(".label--type");
const inputs = [...document.querySelectorAll(".form__input")];
const clearBtn = document.querySelector(".clear--btn")
const sortBtn = document.querySelector(".sortBtn")
class MyDate {
  constructor() {
    this._date = new Date();
    this._current_time = this._date.toLocaleTimeString();
  }

}
class App extends MyDate {
  #map;
  #mapEvent;
  #sort = true;
  #editFlag = false;
  #globalIdx;
  #workoutsData = [];
  #markersData = [];
  #maxZoom = 20;
  constructor() {
    super()
    this._date = new Date();
    this._current_time = this._date.toLocaleString();

    //automatically call 
    this._timerMethod()
    const CurrentTime = setInterval(this._timerMethod.bind(this), 1000);
    this._getPosition()
    containerWorkouts.addEventListener("click", this._handlerClicks.bind(this))
    inputSelect.addEventListener("change", this._toggleElevationField);
    form.addEventListener("submit", this._newWorkOut.bind(this));
    clearBtn.addEventListener("click", this._clearAllData)
    sortBtn.addEventListener("click", this._sortWorkouts.bind(this))

    this._getStorageData()
  }


  _displayDate() {
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    return `On ${this._date.getDate()} ${months[this._date.getMonth()]}`;
  }
  _timerMethod() {
    this._date = new Date();
    this._current_time = this._date.toLocaleTimeString();
    let time = this._current_time.split(":");
    time[0] = Number.parseInt(time[0]);
    const hours = time[0] % 12 || 12;
    const currTime = `${this._displayDate()} ${hours}:${time[1].padStart(2, "0")}:${time[2].padStart(2, "0")}`;
    currentTimerDom.textContent = currTime;
  }
  async _getCurrentLocation(latitude, longitude) {
    const response = await fetch(
      `https://api.opencagedata.com/geocode/v1/json?q=${latitude}+${longitude}&key=223dc0963ac24d8ba3f2b3d94bbf40cc`
    );
    const { results } = await response.json();
    const { formatted } = results[0];
    const currLocation = `Your location: ${formatted}`;
    return currLocation

  }
  async _loadMap(position) {
    try {
      const { latitude, longitude } = position.coords;
      const coords = [latitude, longitude];
      this.#map = L.map("map").setView(coords, 14);
      const MapTilesAPI_OSMEnglish = L.tileLayer(
        "https://maptiles.p.rapidapi.com/en/map/v1/{z}/{x}/{y}.png?rapidapi-key=378e0c371bmsh4d9e2abafdecd1dp1d080djsn833420588ab6",
        {
          attribution:
            '&copy; <a href="http://www.maptilesapi.com/">MapTiles API</a>, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: this.#maxZoom,
        }
      );

      MapTilesAPI_OSMEnglish.addTo(this.#map);

      this.#map.on("click", this._showForm.bind(this));
      const currLocation = await this._getCurrentLocation(latitude, longitude);
      document.querySelector(".location").textContent = currLocation;
      this._getMarkStorage()
      clearBtn.style.display = 'block'

    } catch (err) {
      console.log(err)
      document.querySelector(".location").textContent =
        "Error, try again later !";
    }
  }

  _errorCurrentLocation() {

    document.querySelector(".location").textContent = "Could not get your current position , try again later !";
  }


  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(this._loadMap.bind(this)
        ,
        this._errorCurrentLocation
      );
    }

  }
  _showForm(event) {
    this.#mapEvent = event;
    form.classList.remove("hidden");
    inputDistance.focus();

  }
  _hideForm() {
    form.style.display = 'none'
    form.classList.add("hidden");
    setTimeout(() => form.style.display = 'grid', 1000)
    sortBtn.classList.remove('hiddenBtn')
  }
  _toggleElevationField() {
    const cycling = () => {
      labelType.textContent = "Elev Gain";
      inputType.placeholder = "meters";
    };
    const running = () => {
      labelType.textContent = "Cadence";
      inputType.placeholder = "step/min";
    };

    inputSelect.value == "cycling" ? cycling() : running();


  }

  _checkValidation() {
    for (let i = 0; i < inputs.length; i++) {
      if (!inputs[i].value) {
        alert("all data are required");
        return false;
      }
    }
    const inputsValidate = inputs.slice(1);
    for (let i = 0; i < inputsValidate.length; i++) {
      if (inputSelect.value == "cycling" && Number.isFinite(+inputType.value)) {
        return true
      }
      else if (inputsValidate[i].value < 0) {
        alert("Navigate Number not allowed ");
        return false;
      } else if (inputsValidate[i].value == 0) {
        alert("Zero value not allowed ");
        return false;
      }
    }
    return true
  }
  _newWorkOut(e) {
    e.preventDefault();
    const isValid = this._checkValidation()
    if (!isValid) return
    let workOut;


    const coords = [this.#mapEvent.latlng.lat, this.#mapEvent.latlng.lng]
    const marker = this._displayMarker(this.#map, coords)
    const item = {
      type: inputSelect.value,
      duration: +inputDuration.value,
      distance: +inputDistance.value,
      coords,
      [inputSelect.value === "cycling" ? "elevationGain" : "cadence"]: +inputType.value
    };

    if (inputSelect.value === "cycling") {
      workOut = new Cycling(item.elevationGain, item.distance, item.duration, coords)


    }
    if (inputSelect.value === "running") {
      workOut = new Running(item.cadence, item.distance, item.duration, coords)

    }
    if (this.#editFlag && this.#globalIdx) {

      this._displayWorkOutAfterEdit(workOut)
    }
    else if (!this.#editFlag) {
      this.#workoutsData.push(workOut)
      this._renderWorkOut(workOut, marker)
    }


    localStorage.setItem("data", JSON.stringify(this.#workoutsData));


    this._resetApp()
    this._hideForm()
  }

  _displayWorkOutAfterEdit(item) {
    item.id = this.#globalIdx
    this.#workoutsData[this.#globalIdx] = item
    const workouts = [...document.querySelectorAll(".workout")]
    const workoutToUpdate = workouts.find(
      (workout) => workout.dataset.id === this.#globalIdx
    );

    const newWorkout = this._createDivWorkout(this.#workoutsData[this.#globalIdx], this.#globalIdx);

    const indexToUpdate = workouts.indexOf(workoutToUpdate);
    workouts.splice(indexToUpdate, 1, newWorkout);

    newWorkout.setAttribute("data-id", this.#globalIdx);

    workoutToUpdate.replaceWith(newWorkout);
    this.#editFlag = !this.#editFlag

  }



  _renderWorkOut(workOut, marker) {

    this._displayWorkouts(workOut)
    this._addMarker(marker)

  }
  _addMarker(marker) {
    const options = marker._popup.options
    this.#markersData.push([marker._latlng, options]);
    const markersString = JSON.stringify(this.#markersData);
    localStorage.setItem("markers", markersString);

  }
  _resetApp() {
    inputs.forEach((input, index) => {
      if (index == 0) {
        input.value = "Choose";
        document.querySelector(".label--type").textContent = "default";
        document.querySelector(".form__input--type").placeholder =
          "depend on your choose";
      } else {
        input.value = "";
      }
    });
  }
  _displayMarker(map, coords) {
    this._date = new Date();
    let marker = null;
    if (marker !== null) {
      map.removeLayer(marker);
    }

    const cyclingText = `🚴&zwj;♀️ ${inputSelect.value} ${this._displayDate()}`;
    const runningText = `🏃&zwj;♂️  ${inputSelect.value} ${this._displayDate()}`;

    const content = inputSelect.value == "cycling" ? cyclingText : runningText;
    const options = {
      content,
      autoClose: false,
      maxWidth: 300,
      minWidth: 50,
      closeOnClick: false,
      className: `${inputSelect.value}-popup`
    };
    marker = L.marker(coords).addTo(this.#map);
    const popup = L.popup(options);
    marker.bindPopup(popup).openPopup();


    return marker

  }
  _createDivWorkout(item, index) {
    this._date = new Date();
    const div = document.createElement("div")
    div.classList.add('workout', `workout--${item.type}`);
    const attr = document.createAttribute("data-id")
    attr.value = index
    div.setAttributeNode(attr)
    div.innerHTML = `
    <svg class="workouts__btn close-btn" id='closeBtn' viewBox="0 0 24 24"  xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <g id="Interface / Trash_Full"> <path id="Vector" d="M14 10V17M10 10V17M6 6V17.8C6 18.9201 6 19.4798 6.21799 19.9076C6.40973 20.2839 6.71547 20.5905 7.0918 20.7822C7.5192 21 8.07899 21 9.19691 21H14.8031C15.921 21 16.48 21 16.9074 20.7822C17.2837 20.5905 17.5905 20.2839 17.7822 19.9076C18 19.4802 18 18.921 18 17.8031V6M6 6H8M6 6H4M8 6H16M8 6C8 5.06812 8 4.60241 8.15224 4.23486C8.35523 3.74481 8.74432 3.35523 9.23438 3.15224C9.60192 3 10.0681 3 11 3H13C13.9319 3 14.3978 3 14.7654 3.15224C15.2554 3.35523 15.6447 3.74481 15.8477 4.23486C15.9999 4.6024 16 5.06812 16 6M16 6H18M18 6H20"  stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path> </g> </g></svg>
<svg class="workouts__btn edit-btn" id="editBtn" viewBox="0 -0.5 21 21" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <title>edit_fill [#1480]</title> <desc>Created with Sketch.</desc> <defs> </defs> <g id="Page-1" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd"> <g id="Dribbble-Light-Preview" transform="translate(-59.000000, -400.000000)" fill="#000000"> <g id="icons" transform="translate(56.000000, 160.000000)"> <path d="M3,260 L24,260 L24,258.010742 L3,258.010742 L3,260 Z M13.3341,254.032226 L9.3,254.032226 L9.3,249.950269 L19.63095,240 L24,244.115775 L13.3341,254.032226 Z" id="edit_fill-[#1480]"> </path> </g> </g> </g> </g></svg>

<h4 class="workout__title"> ${item.type.replace(item.type[0], item.type[0].toUpperCase())} on ${this._displayDate()}</h4>
                    <ul class="workout__list">
                        <li class="workout__item">
          <span class="workout__icon">${this._isTypeCycling(item.type, "🚴‍♀️", '🏃‍♂️')}</span>
          <span class="workout__value">${item.distance}</span>
          <span class="workout__unit">km</span>
                        </li>
                         <li class="workout__item">
          <span class="workout__icon">⏱</span>
          <span class="workout__value">${item.duration}</span>
          <span class="workout__unit">MIN</span>
                        </li>
                         <li class="workout__item">
                            
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${this._isTypeCycling(item.type, item.speed, item.pace)}</span>
          <span class="workout__unit">${this._isTypeCycling(item.type, "KM/H", 'MIN/KM')}</span>
                        </li>
                         <li class="workout__item">
          <span class="workout__icon"> ${this._isTypeCycling(item.type, "⛰", '🦶🏼')}</span>
          <span class="workout__value">${this._isTypeCycling(item.type, item.elevationGain, item.cadence)}</span>
          <span class="workout__unit">${this._isTypeCycling(item.type, "M", 'SPM')}</span>
                        </li>
                    </ul>
                </div>
    `
    return div
  }
  _isTypeCycling(type, c1, c2) {
    return type == 'cycling' ? c1 : c2

  }


  _displayWorkouts(workOut) {
    const fragment = document.createDocumentFragment()
    const div = this._createDivWorkout(workOut, workOut.id)
    fragment.appendChild(div)
    const tempDiv = document.createElement('div');
    tempDiv.appendChild(fragment);
    form.insertAdjacentHTML('afterend', tempDiv.innerHTML);
  }

  __moveToMarker(workOutEl) {
    const { id } = workOutEl.dataset
    const workout = this.#workoutsData.find(work => work.id === id)
    this.#map.setView(workout.coords, this.#maxZoom - 5, {
      animate: true,
      pan: {
        duration: 1

      }

    })
  }

  _reconstructWithProto(obj) {
    const proto = obj.proto === "Cycling" ? Cycling.prototype : Running.prototype;
    const newObj = Object.create(proto);
    return Object.assign(newObj, obj);
  }

  _getStorageData() {
    if (!localStorage.getItem("data")) return
    this.#workoutsData = JSON.parse(localStorage.getItem("data"));
    this.#markersData = JSON.parse(localStorage.getItem("markers"));
    const reverseWorkOutsData = this.#workoutsData.slice().reverse()

    // fragment.appendChild(this._createDivWorkout(item, item.id))

    // if (item.type === "cycling") {
    //    workOut = new Cycling(item.elevationGain, item.distance, item.duration, item.coords)
    // }
    // if (item.type === "running") {
    //    workOut = new Running(item.cadence, item.distance, item.duration, item.coords)

    // }
    this._displayAfterSortOrNot(reverseWorkOutsData, true, false)

    sortBtn.classList.remove('hiddenBtn')



  }
  _displayAfterSortOrNot(data, localStorage = false, sort = false) {
    const fragment = document.createDocumentFragment()

    if (localStorage) {
      data.forEach((item, i) => {

        const reconstructedItem = this._reconstructWithProto(item);
        fragment.appendChild(this._createDivWorkout(reconstructedItem, item.id));

      });
    }
    if (!localStorage  ) {
      const allWorkouts = document.querySelectorAll(".workout")
      allWorkouts.forEach(work => work.remove())
      data.forEach((item, i) => {
        fragment.appendChild(this._createDivWorkout(item, item.id));

      });

    }

    //reverseWorkOutsData


    const tempDiv = document.createElement('div');
    tempDiv.appendChild(fragment);
    form.insertAdjacentHTML('afterend', tempDiv.innerHTML);

  }

  _getMarkStorage() {

    const markersString = localStorage.getItem("markers");
    if (!markersString) return
    this.#markersData.forEach((data) => {
      const { lat, lng } = data[0]
      const coords = [lat, lng]
      const ops = data[1]
      const options = { ...ops }
      const marker = L.marker(coords).addTo(this.#map);
      const popup = L.popup(options);
      marker.bindPopup(popup).openPopup();
    });
  }
  _handlerClicks(e) {
    const workOutEl = e.target.closest(".workout")
    if (workOutEl) this.__moveToMarker(workOutEl)

    const clicked = e.target.closest(".workouts__btn")
    if (!clicked) return
    const btn = clicked.id
    if (btn === 'closeBtn') this._deleteWorkOut(clicked)
    if (btn === 'editBtn') this.__editWorkOutData(clicked)

  }
  __editWorkOutData(clicked) {
    const workoutEl = clicked.closest(".workout")
    const { id } = workoutEl.dataset
    const workout = this.#workoutsData.find(work => work.id === id)
    // const workOutIndex = this.#workoutsData.indexOf(workout)

    form.classList.remove("hidden");
    inputDistance.value = workout.distance
    inputDuration.value = workout.duration
    inputSelect.value = workout.type
    inputType.value = workout[inputSelect.value === "cycling" ? "elevationGain" : "cadence"]
    this.#editFlag = true
    this.#globalIdx = id


  }



  _deleteWorkOut(clicked) {
    const workoutEl = clicked.closest(".workout")
    const { id } = workoutEl.dataset
    const workout = this.#workoutsData.find(work => work.id === id)
    const workOutIndex = this.#workoutsData.indexOf(workout)
    const marker = this.#markersData.find((item) => {
      const { lat, lng } = item[0]
      const coords = [lat, lng]
      return coords.filter((c, i) => workout.coords[i] == c)
    })

    const indexMark = this.#markersData.indexOf(marker)
    this.#workoutsData.splice(workOutIndex, 1)
    this.#markersData.splice(indexMark, 1)


    localStorage.setItem("data", JSON.stringify(this.#workoutsData))

    localStorage.setItem("markers", JSON.stringify(this.#markersData));


    // this._getMarkStorage()
    workoutEl.remove()

  }

  _clearAllData() {
    localStorage.removeItem("data")
    localStorage.removeItem("markers")
    const workOuts = document.querySelectorAll(".workout")
    console.log(workOuts)
    workOuts.forEach(w => w.remove())
    document.querySelector(".leaflet-marker-pane").innerHTML = ''
    document.querySelector(".leaflet-marker-pane").innerHTML = ''
    document.querySelector(".leaflet-tooltip-pane").innerHTML = ''
    document.querySelector(".leaflet-popup-pane").innerHTML = ''
    document.querySelector(".leaflet-shadow-pane").innerHTML = ''
    sortBtn.classList.add("hiddenBtn")

  }


  _sortWorkouts() {
    if (this.#workoutsData.length < 2) return

    
    const data = this.#sort
    ? this.#workoutsData.slice().sort((a, b) => b.distance - a.distance)
    : this.#workoutsData.slice().sort((a, b) => a.distance - b.distance);
    this._displayAfterSortOrNot(data, false, !this.#sort);
    this.#sort = !this.#sort;





  }
}


class WorkOut extends MyDate {
  id = crypto.randomUUID()
  constructor(distance, duration, coords) {
    super()

    this.distance = distance
    this.duration = duration
    this.coords = coords

  }

}
class Running extends WorkOut {
  type = 'running';
  constructor(cadence, ...args) {
    super(...args)
    this.cadence = cadence
    this.calcPace()

  }
  calcPace() {
    this.pace = (this.duration / this.distance).toFixed(1)
    return this.pace
  }
}
class Cycling extends WorkOut {
  type = 'cycling'
  constructor(elevationGain, ...args) {
    super(...args)
    this.elevationGain = elevationGain
    this.calcSpeed()
  }
  calcSpeed() {
    this.speed = (this.distance / (this.duration / 60)).toFixed(1)
    return this.speed
  }

}

const app = new App()
