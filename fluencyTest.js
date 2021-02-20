const TEST_DURATION = 60; // Durée du test en secondes

const MainApp = class {
	constructor() {}

	static initialize() {
		const textSelection = new TextSelection('./texts');
		textSelection.show();
	}
};

const Utils = class {
	static createDiv(id) {
		const div = document.createElement("div");
		div.id = id;
		return div;
	}

	static createP(text, useClass = null) {
		const p = document.createElement("p");
		p.innerHTML = text;
		if (useClass) p.classList.add(useClass);
		return p;
	}

	static createButton(text, id) {
		const div = document.createElement("div");
		div.id = id;
		div.innerHTML = text;
		div.classList.add("button");
		return div;
	}

	static clearContainer() {
		document.getElementById("container").innerHTML = "";
	}

	static containerAddChild(child) {
		Utils.clearContainer();
		document.getElementById("container").appendChild(child);
	}
};

const Parser = class {
	static parse(file) {
		return new Promise((accept, reject) => {
			const reader = new FileReader();
	        reader.onload = (e) => {
	            const contents = reader.result;
	            const lines = contents.split('\n');
	       
	       		accept(lines);
	        };
	        reader.readAsText(file);
		});
	}
};

const TextSelection = class {
	constructor(root) {
		this._root = root;
		this.createView();
	}

	createView() {
		this._parent = document.createElement("div");
		const text = Utils.createP("Veuillez choisir le texte que vous souhaitez utiliser pour le test <i>(seuls les fichiers .txt sont autorisés)</i> :");

		const input = document.createElement("input");
		input.setAttribute("type", "file");
		input.setAttribute("accept", "text/txt");
		this._textSelector = input;

		this._parent.append(text);
		this._parent.append(input);
	}

	show() {
		Utils.containerAddChild(this._parent);
		this.addEventListeners();
	}

	addEventListeners() {
		this._textSelector.addEventListener("change", this.onChangeTextSelector.bind(this));
	}

	async onChangeTextSelector(e) {
		if (this._textSelector.files.length > 0) {
			const file = this._textSelector.files[0];	
			const lines = await Parser.parse(file);
			const fluencyTest = new FluencyTest(lines);
			fluencyTest.show();
		}
	}
};

const FluencyTest = class {
	constructor(words) {
		this._words = words;
		this._wrongWords = [];
		this._mode = "reading";
		this._lastWord = -1;

		this._view = new FluencyTestView(this);		
	}

	show() {
		this._view.show();
		this.lanceChrono();
	}

	getWords() {
		return this._words;
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

const FluencyTestView = class {
	constructor(fluencyTest) {
		this._fluencyTest = fluencyTest;
		this._words = fluencyTest.getWords();
		this.create();
	}

	show() {
		Utils.containerAddChild(this._parent);
		this.addEventListeners();
	}

	addEventListeners() {
		this._textDiv.addEventListener("click", this._fluencyTest.onClickWord.bind(this._fluencyTest));
		this._endButton.addEventListener("click", this._fluencyTest.onClickEnd.bind(this._fluencyTest));
		this._resetButton.addEventListener("click", this._fluencyTest.onClickReset.bind(this._fluencyTest));
	}

	create() {
		this._parent = document.createElement("div");
		this._chronoDiv = this.createChrono();
		this._textDiv = Utils.createDiv("textContainer");
		this._endButton = Utils.createButton("Terminer le test", "endButton");
		this._endDiv = Utils.createDiv("endContainer");
		this._resetButton = Utils.createButton("Réinitialiser le test", "resetButton");

		this._textDiv.appendChild(this.createText());
		this._parent.appendChild(this._chronoDiv);
		this._parent.appendChild(this._textDiv);
		this._parent.appendChild(this._endButton);
		this._parent.appendChild(this._endDiv);
		this._parent.appendChild(this._resetButton);
	}

	createChrono() {
		const chronoDiv = Utils.createDiv("chronoContainer");

		const textElement = Utils.createDiv("chronoText");
		textElement.innerHTML = TEST_DURATION;
		this._chronoText = textElement;

		const chronoBox = Utils.createDiv("chronoBox");
		const chronoPercent = Utils.createDiv("chronoPercent");
		this._chronoPercent = chronoPercent;

		chronoBox.appendChild(this._chronoPercent);
		chronoDiv.appendChild(this._chronoText);
		chronoDiv.appendChild(chronoBox);

		return chronoDiv;
	}

	createText() {
		const fragment = new DocumentFragment();
		for (let i = 0; i < this._words.length; i++) {
			const span = document.createElement("span");
			span.innerHTML = this._words[i];
			span.dataset.id = i;
			fragment.appendChild(span);
		}
		return fragment;
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
			const instructions = Utils.createP("Cliquer sur le dernier mot lu pour afficher les résultats", "italic");
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

		const title = Utils.createP("Résultats :", "italic");
		const time = Utils.createP(`Temps: ${TEST_DURATION - remainingTime} secondes`);
		const readWords = Utils.createP(`Nombre de mots lus : ${totalReadWords}`);
		const wrongWords = Utils.createP(`Erreurs : ${totalWrongWords}`);
		const fluencyScore = Utils.createP(`Score de fluence : ${totalReadWords - totalWrongWords}`, "bold");

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

MainApp.initialize();
// FluencyTest.initialize();