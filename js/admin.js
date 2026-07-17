import { db, ref, onValue, set, update, get, auth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "./firebase.js";
import { showAlert, showConfirm } from "./alert.js";

const ADMIN_EMAIL = "admin@panel.com";

const loginScreen   = document.getElementById("login-screen");
const appContent    = document.getElementById("app-content");
const loginForm     = document.getElementById("login-form");
const passwordInput = document.getElementById("login-password");
const loginError    = document.getElementById("login-error");
const logoutButton  = document.getElementById("logout-button");

let authReadyFired = false;

onAuthStateChanged(auth, (user) => {
    if (user && user.email === ADMIN_EMAIL) {
        loginScreen.style.display = "none";
        appContent.style.display  = "block";

        if (!authReadyFired) {
            authReadyFired = true;
            window.dispatchEvent(new Event("admin-authenticated"));
        }
    } else {
        if (user && user.email !== ADMIN_EMAIL) {
            signOut(auth);
        }
        loginScreen.style.display = "flex";
        appContent.style.display  = "none";
    }
});

loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    loginError.textContent = "";

    const password = passwordInput.value;
    if (!password) return;

    const submitBtn = loginForm.querySelector("button[type='submit']");
    submitBtn.disabled = true;

    try {
        await signInWithEmailAndPassword(auth, ADMIN_EMAIL, password);
        passwordInput.value = "";
    } catch (err) {
        loginError.textContent = "Неверный пароль";
    } finally {
        submitBtn.disabled = false;
    }
});

logoutButton?.addEventListener("click", () => signOut(auth));
// ---------- Конец авторизации ----------

const el = {
	selector:        document.getElementById("lottery-selector"),
	listTitle:       document.getElementById("lottery-list-title"),
	createEntry:     document.getElementById("lottery-create-entry"),
	createForm:      document.getElementById("lottery-create-form"),
	lotteriesList:   document.getElementById("lotteries-list"),
	adminPanel:      document.getElementById("admin-panel"),
	lotteryTitle:    document.getElementById("lottery-title"),
	availableCount:  document.getElementById("available-count"),
	viewNumbersBtn:  document.getElementById("view-numbers-button"),
	freeNumbersList: document.getElementById("free-numbers-list"),
	usersList:       document.getElementById("users-list"),
	numbersModal:    document.getElementById("numbersModal"),
	allNumbersList:  document.getElementById("all-numbers-list"),
	paymentToggleBtn: document.getElementById("payment-toggle-button"),
	surpriseToggle:  document.getElementById("enable-surprise"),
	surprisePrice:   document.getElementById("surprise-price"),
	surpriseCount:   document.getElementById("surprise-count"),
};

let unsubscribers = [];
let currentPageId = null;

function unsubscribeAll() {
	unsubscribers.forEach(fn => fn());
	unsubscribers = [];
}

function subscribe(fbRef, callback) {
	const unsub = onValue(fbRef, callback);
	unsubscribers.push(unsub);
	return unsub;
}

el.surpriseToggle.addEventListener("change", () => {
	const show = el.surpriseToggle.checked;
	el.surprisePrice.style.display = show ? "block" : "none";
	el.surpriseCount.style.display = show ? "block" : "none";
});

function showCreateForm(visible) {
	el.createForm.style.display     = visible ? "flex"   : "none";
	el.createEntry.style.display    = visible ? "none"   : "block";
	el.lotteriesList.style.display  = visible ? "none"   : "block";
	el.listTitle.style.display      = visible ? "none"   : "block";
}

document.getElementById("open-create-form").addEventListener("click", () => showCreateForm(true));
document.getElementById("create-back-button").addEventListener("click", () => showCreateForm(false));

document.getElementById("create-lottery-button").addEventListener("click", async () => {
	const name  = document.getElementById("new-lottery-name").value.trim();
	const total = parseInt(document.getElementById("new-lottery-total").value, 10);
	const free  = parseInt(document.getElementById("new-lottery-free").value, 10);
	const price = parseInt(document.getElementById("new-lottery-price").value, 10);

	const surpriseEnabled = el.surpriseToggle.checked;
	const surprisePrice   = parseInt(el.surprisePrice.value, 10);
	const surpriseCount   = parseInt(el.surpriseCount.value, 10);

	if (!name || isNaN(total) || isNaN(free) || isNaN(price)) {
		return showAlert("Заполните поля корректно");
	}
	if (free > total) {
		return showAlert("Бесплатных номеров не может быть больше, чем всего номеров");
	}
	if (surpriseEnabled) {
		if (isNaN(surprisePrice) || surprisePrice <= 0) return showAlert("Укажите корректную цену сюрприза");
		if (isNaN(surpriseCount) || surpriseCount <= 0) return showAlert("Укажите корректное количество сюрпризов");
		if (surpriseCount > free) return showAlert("Количество сюрпризов не может быть больше количества бесплатных номеров");
	}

	const numbers = {};
	for (let i = 1; i <= total; i++) numbers[i] = true;

	const shuffled = Object.keys(numbers).map(Number).sort(() => Math.random() - 0.5);
	const freeNumbers = {};
	shuffled.slice(0, free).forEach(n => freeNumbers[n] = true);

	const surpriseNumbers = {};
	if (surpriseEnabled) {
		Object.keys(freeNumbers).map(Number)
			.sort(() => Math.random() - 0.5)
			.slice(0, surpriseCount)
			.forEach(n => surpriseNumbers[n] = true);
	}

	await set(ref(db, `pages/${name}`), {
		total,
		priceNumber: price,
		availableNumbers: numbers,
		freeNumbers,
		surpriseNumbers: surpriseEnabled ? surpriseNumbers : {},
		surprisePrice:   surpriseEnabled ? surprisePrice   : 0,
		allowPayment: false,
	});

	showAlert(`Лотерея "${name}" создана!`);

	["new-lottery-name", "new-lottery-total", "new-lottery-price", "new-lottery-free", "surprise-count", "surprise-price"]
		.forEach(id => document.getElementById(id).value = "");
	el.surpriseToggle.checked = false;
	el.surprisePrice.style.display = "none";
	el.surpriseCount.style.display = "none";

	showCreateForm(false);
	loadLotteries();
});

let unsubLotteries = null;

function loadLotteries() {
	if (unsubLotteries) { unsubLotteries(); unsubLotteries = null; }

	el.lotteriesList.innerHTML = "Загрузка...";

	unsubLotteries = onValue(ref(db, "pages"), (snapshot) => {
		el.lotteriesList.innerHTML = "";
		if (!snapshot.exists()) {
			el.lotteriesList.innerText = "Лотерей нет";
			return;
		}
		snapshot.forEach((child) => {
			const btn = document.createElement("button");
			btn.textContent = child.key;
			btn.onclick = () => openLottery(child.key);
			el.lotteriesList.appendChild(btn);
		});
	});
}

function openLottery(pageId) {
	currentPageId = pageId;
	el.selector.style.display    = "none";
	el.adminPanel.style.display  = "flex";
	el.lotteryTitle.innerText    = pageId;

	unsubscribeAll();
	loadPaymentStatus();
	trackAvailableNumbers();
	loadFreeNumbers();
	loadUsers();

	document.getElementById("delete-lottery-button").onclick = () => {
		showConfirm(`Удалить лотерею "${currentPageId}"?`, (result) => {
			if (result) deleteLottery(currentPageId);
		});
	};
}

document.getElementById("back-button").addEventListener("click", () => {
	unsubscribeAll();
	el.adminPanel.style.display = "none";
	el.selector.style.display   = "block";
	loadLotteries();
});

function loadPaymentStatus() {
	const refPay = ref(db, `pages/${currentPageId}/allowPayment`);
	subscribe(refPay, (snap) => {
		const allowed = snap.val() || false;
		el.paymentToggleBtn.textContent        = allowed ? "Отключить оплату" : "Включить оплату";
		el.paymentToggleBtn.style.backgroundColor = allowed ? "#f44336" : "#4CAF50";
		el.paymentToggleBtn.onclick = () => set(refPay, !allowed);
	});
}

async function deleteLottery(pageId) {
	const updates = { [`pages/${pageId}`]: null };

	const usersSnap = await get(ref(db, "users"));
	usersSnap.forEach((userSnap) => {
		if (userSnap.val().pages?.[pageId]) {
			updates[`users/${userSnap.key}/pages/${pageId}`] = null;
		}
	});

	await update(ref(db), updates);
	showAlert(`Лотерея "${pageId}" удалена.`);
	unsubscribeAll();
	el.adminPanel.style.display = "none";
	el.selector.style.display   = "block";
	loadLotteries();
}

function trackAvailableNumbers() {
	subscribe(ref(db, `pages/${currentPageId}/availableNumbers`), (snapshot) => {
		const count = snapshot.val() ? Object.keys(snapshot.val()).length : 0;
		el.availableCount.textContent = count > 0 ? `Свободных номеров: ${count}` : "Номера разобраны";
		el.availableCount.style.color = count > 0 ? "black" : "green";

		el.viewNumbersBtn.style.display = count > 0 ? "block" : "none";
		if (count === 0 && el.numbersModal.style.display === "flex") {
			el.numbersModal.style.display = "none";
		}
	});
}

let unsubAllNumbers = null;

function loadAllNumbers() {
	if (unsubAllNumbers) { unsubAllNumbers(); unsubAllNumbers = null; }

	unsubAllNumbers = onValue(ref(db, `pages/${currentPageId}`), (snapshot) => {
		const data            = snapshot.val() || {};
		const available       = data.availableNumbers  || {};
		const freeNums        = data.freeNumbers        || {};
		const surpriseNums    = data.surpriseNumbers    || {};

		const nums = Object.keys(available).map(Number).sort((a, b) => a - b);
		el.allNumbersList.innerHTML = nums.map((n) => {
			if (surpriseNums[n]) return `<span style="color: goldenrod; font-weight: bold;">${n}</span>`;
			if (freeNums[n])     return `<span style="color: green; font-weight: bold;">${n}</span>`;
			return `<span>${n}</span>`;
		}).join(", ");
	});
}

el.viewNumbersBtn.addEventListener("click", () => {
	loadAllNumbers();
	el.numbersModal.style.display = "flex";
});

function closeModal() {
	el.numbersModal.style.display = "none";
	if (unsubAllNumbers) { unsubAllNumbers(); unsubAllNumbers = null; }
}

document.getElementById("closeNumbersModal").addEventListener("click", closeModal);
window.addEventListener("click", (e) => { if (e.target === el.numbersModal) closeModal(); });

function loadFreeNumbers() {
	subscribe(ref(db, `pages/${currentPageId}/freeNumbers`), async (freeSnap) => {
		const freeNumbers = freeSnap.val() || {};
		const surpriseSnap = await get(ref(db, `pages/${currentPageId}/surpriseNumbers`));
		const surpriseNumbers = surpriseSnap.val() || {};

		const nums = Object.keys(freeNumbers).map(Number).sort((a, b) => a - b);
		if (nums.length === 0) {
			el.freeNumbersList.innerText = "Нет";
			return;
		}
		el.freeNumbersList.innerHTML = nums.map((n) =>
			surpriseNumbers[n]
				? `<span style="color: goldenrod; font-weight: bold;">${n}</span>`
				: `<span style="color: green; font-weight: bold;">${n}</span>`
		).join(", ");
	});
}

function loadUsers() {
	subscribe(ref(db, `pages/${currentPageId}`), async (pageSnap) => {
		const data           = pageSnap.val() || {};
		const price          = data.priceNumber   || 0;
		const freeNumbers    = data.freeNumbers    ? Object.keys(data.freeNumbers).map(Number)    : [];
		const surpriseNumbers = data.surpriseNumbers ? Object.keys(data.surpriseNumbers).map(Number) : [];
		const surprisePrice  = data.surprisePrice  || 0;

		const usersSnap = await get(ref(db, "users"));
		el.usersList.innerHTML = "";

		usersSnap.forEach((userSnap) => {
			const username    = userSnap.key;
			const pageData    = userSnap.val().pages?.[currentPageId] || {};
			const numbers     = pageData.Numbers ? Object.values(pageData.Numbers).map(Number) : [];
			const paymentStatus = pageData.payment || null;

			if (numbers.length === 0) return;

			const paid      = numbers.filter(n => !freeNumbers.includes(n));
			const surprises = numbers.filter(n => freeNumbers.includes(n) && surpriseNumbers.includes(n));
			const total     = Math.max(0, paid.length * price - surprises.length * surprisePrice);

			const formatted = numbers.map((n) => {
				if (freeNumbers.includes(n) && surpriseNumbers.includes(n))
					return `<span style="color: goldenrod; font-weight: bold;">${n}</span>`;
				if (freeNumbers.includes(n))
					return `<span style="color: green; font-weight: bold;">${n}</span>`;
				return n;
			});

			let paymentHTML = "";
			if (paymentStatus === "pending") {
				paymentHTML = `<button class="confirm-button" data-user="${username}">Подтвердить</button>`;
			} else if (paymentStatus === "confirmed") {
				paymentHTML = `<img src="check.png" style="width: 20px;" alt="✓">`;
			}

			const div = document.createElement("div");
			div.innerHTML = `<strong>${username}:</strong> ${formatted.join(", ")} — (${total}₽) ${paymentHTML}`;
			el.usersList.appendChild(div);
		});

		if (!el.usersList.innerHTML) {
			el.usersList.innerHTML = "<p style='text-align: center; color: #888;'>Пусто</p>";
		}

		el.usersList.querySelectorAll(".confirm-button").forEach((btn) => {
			btn.addEventListener("click", () => {
				const user = btn.dataset.user;
				showConfirm(`Подтвердить оплату для ${user}?`, async (result) => {
					if (result) await set(ref(db, `users/${user}/pages/${currentPageId}/payment`), "confirmed");
				});
			});
		});
	});
}
window.addEventListener("admin-authenticated", loadLotteries);