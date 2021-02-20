import { FLUENCY_WORDS } from "./textFluence.js";

const TEST_DURATION = 60; // Durée du test en secondes

const FluencyTest = class {
	static initialize() {
		const fluencyTest = new FluencyTest();
		fluencyTest.show();
	}

	constructor() {
		this._wrongWords = [];
		this._mode = "reading";
		this._lastWord = -1;

		this._view = new View(this);		
	}

	show() {
		this._view.show();
		this.lanceChrono();
	}

	clearChrono(isReset = false) {
		clearInterval(this._chronoInterval);
		this._chronoInterval = null;
		if (isReset) this._view.resetChrono();
	}

	lanceChrono() {
		if (this._chronoInterval) this.clearChrono(true);

		this._time = this._remainingTime = TEST_DURATION;
		this._view.updateChrono(this._time);

		this._chronoInterval = setInterval(() => {
			this._time -= 1;
			if (this._time === 0) this.clearChrono();
			this._view.updateChrono(this._time);
		}, 1000);
	}

	onClickEnd(e) {
		if (this._mode === "reading") {
			this._remainingTime = this._time;
			this._mode = "end";
			this._view.prepareEnd();
		} else {
			this._mode = "reading";
			this.setLastWord(-1);
			this._view.prepareEnd(false);
		}
	}

	onClickReset(e) {
		this._view.reset();
		this._mode = "reading";
		this._wrongWords = [];
		this.lanceChrono();
	}

	onClickWord(e) {
		const span = e.target;
		const wordId = span.dataset.id;
		if (!wordId) return;

		if (this._mode === "reading") {
			const alreadyExists = this._wrongWords.indexOf(wordId);
			if (alreadyExists === -1) {
				this._wrongWords.push(wordId);
				this._view.showWrong(span);
			} else {
				this._wrongWords.splice(alreadyExists, 1);
				this._view.showWrong(span, false);
			}
		} else {
			this.setLastWord(wordId, span);
		}
	}

	setLastWord(wordId, span) {
		if (this._lastWord !== -1) {
			const lastSpan = this._view.getSpanWord(this._lastWord);
			this._view.showLastWord(lastSpan, false);
		}

		if (wordId !== -1) {
			this._lastWord = wordId;
			this._view.showLastWord(span);
			this.showEnd();
		}
	}

	showEnd() {
		const totalReadWords = parseInt(this._lastWord, 10) + 1;
		const totalWrongWords = this._wrongWords.length;
		this._view.showEnd(this._remainingTime, totalReadWords, totalWrongWords);
	}
};

const View = class {
	constructor(fluencyTest) {
		this._fluencyTest = fluencyTest;
		this._create();
	}

	show() {
		document.getElementById("container").appendChild(this._parent);
		this.addEventListeners();
	}

	addEventListeners() {
		this._textDiv.addEventListener("click", this._fluencyTest.onClickWord.bind(this._fluencyTest));
		this._endButton.addEventListener("click", this._fluencyTest.onClickEnd.bind(this._fluencyTest));
		this._resetButton.addEventListener("click", this._fluencyTest.onClickReset.bind(this._fluencyTest));
	}

	_create() {
		this._parent = document.createElement("div");
		this._chronoDiv = this._createChrono();
		this._textDiv = this._createDiv("textContainer");
		this._endButton = this._createButton("Terminer le test", "endButton");
		this._endDiv = this._createDiv("endContainer");
		this._resetButton = this._createButton("Réinitialiser le test", "resetButton");

		this._textDiv.appendChild(this._createText());
		this._parent.appendChild(this._chronoDiv);
		this._parent.appendChild(this._textDiv);
		this._parent.appendChild(this._endButton);
		this._parent.appendChild(this._endDiv);
		this._parent.appendChild(this._resetButton);
	}

	_createDiv(id) {
		const div = document.createElement("div");
		div.id = id;
		return div;
	}

	_createP(text, useClass = null) {
		const p = document.createElement("p");
		p.innerHTML = text;
		if (useClass) p.classList.add(useClass);
		return p;
	}

	_createChrono() {
		const chronoDiv = this._createDiv("chronoContainer");

		const textElement = this._createDiv("chronoText");
		textElement.innerHTML = TEST_DURATION;
		this._chronoText = textElement;

		const chronoBox = this._createDiv("chronoBox");
		const chronoPercent = this._createDiv("chronoPercent");
		this._chronoPercent = chronoPercent;

		chronoBox.appendChild(this._chronoPercent);
		chronoDiv.appendChild(this._chronoText);
		chronoDiv.appendChild(chronoBox);

		return chronoDiv;
	}

	_createText() {
		const fragment = new DocumentFragment();
		for (let i = 0; i < FLUENCY_WORDS.length; i++) {
			const span = document.createElement("span");
			span.innerHTML = FLUENCY_WORDS[i];
			span.dataset.id = i;
			fragment.appendChild(span);
		}
		return fragment;
	}

	_createButton(text, id) {
		const div = document.createElement("div");
		div.id = id;
		div.innerHTML = text;
		div.classList.add("button");
		return div;
	}

	updateChrono(time) {
		this._chronoText.innerHTML = time;
		const percent = 100 - (100 * time / TEST_DURATION);
		this._chronoPercent.style.width = `${percent}%`;
	}

	resetChrono() {
		this._chronoPercent.style.width = 0;
	}

	prepareEnd(isPrepared = true) {
		if (isPrepared) {
			const instructions = this._createP("Cliquer sur le dernier mot lu pour afficher les résultats", "italic");
			this._endDiv.appendChild(instructions);
			this._endButton.innerHTML = "Modifier les fautes";
		} else {
			this._endDiv.innerHTML = "";
			this._endButton.innerHTML = "Terminer le test";
		}
	}

	getSpanWord(idWord) {
		return this._textDiv.querySelector(`span[data-id="${idWord}"]`);
	}

	showWrong(span, isWrong = true) {
		if (isWrong) span.classList.add("wrong");
		else span.classList.remove("wrong");
	}

	showLastWord(span, isLast = true) {
		if (isLast) span.classList.add("end");
		else span.classList.remove("end"); 
	}

	showEnd(remainingTime, totalReadWords, totalWrongWords) {
		this._endDiv.innerHTML = "";

		const title = this._createP("Résultats :", "italic");
		const time = this._createP(`Temps: ${TEST_DURATION - remainingTime} secondes`);
		const readWords = this._createP(`Nombre de mots lus : ${totalReadWords}`);
		const wrongWords = this._createP(`Erreurs : ${totalWrongWords}`);
		const fluencyScore = this._createP(`Score de fluence : ${totalReadWords - totalWrongWords}`, "bold");

		this._endDiv.appendChild(title);
		this._endDiv.appendChild(time);
		this._endDiv.appendChild(readWords);
		this._endDiv.appendChild(wrongWords);
		this._endDiv.appendChild(fluencyScore);
	}

	reset() {
		const endElement = this._textDiv.querySelector(".end");
		if (endElement) endElement.classList.remove("end");
		this._textDiv.querySelectorAll(".wrong").forEach((element) => {
			this.showWrong(element, false);
		});
		this.prepareEnd(false);
	}
};

window.FluencyTest = FluencyTest;
FluencyTest.initialize();