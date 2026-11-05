
/**
 * LEMON VEHICLE
 * Vehicle Catalog Frontend
 */

// Google Apps ScriptのウェブアプリURLを設定
const API_URL = "https://script.google.com/macros/s/AKfycbyInWaKkpQJ2EJPJQN2qROJ6VNolmuw9fQqEQD8lCkOnCbb0Jdl30J_W2T1-ocnKqOPFg/exec";

// Elements
const vehicleGrid = document.getElementById("vehicleGrid");
const vehicleCount = document.getElementById("vehicleCount");
const currentCategory = document.getElementById("currentCategory");
const errorMessage = document.getElementById("errorMessage");
const emptyMessage = document.getElementById("emptyMessage");
const retryButton = document.getElementById("retryButton");

const tabs = document.querySelectorAll(".tab");

// Data
let vehicles = [];
let activeCategory = "ALL";

const categoryNames = {
  ALL: "ALL VEHICLES",
  普通車: "STANDARD VEHICLES",
  高級車: "LUXURY VEHICLES",
  航空機: "AIRCRAFT",
  ボート: "BOATS"
};

// 初期化
document.addEventListener("DOMContentLoaded", () => {
  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      const category = tab.dataset.category;
      changeCategory(category);
    });
  });

  retryButton.addEventListener("click", loadVehicles);

  loadVehicles();
});

// JSONPでデータ取得
function loadVehicles() {
  if (!API_URL || API_URL.includes("ここにGAS")) {
    showError("API_URLが設定されていません。");
    return;
  }

  errorMessage.hidden = true;
  emptyMessage.hidden = true;

  vehicleGrid.innerHTML = `
    <div class="loading">
      <div class="loader"></div>
      <p>LOADING VEHICLES...</p>
    </div>
  `;

  const callbackName = "receiveVehicles";

  // 以前のスクリプトを削除
  const oldScript = document.getElementById("vehicle-api-script");
  if (oldScript) oldScript.remove();

  // タイムアウト
  let completed = false;

  const timeout = setTimeout(() => {
    if (!completed) {
      completed = true;
      delete window[callbackName];
      showError("データ取得がタイムアウトしました。");
    }
  }, 15000);

  // GASからのJSONP受信
  window[callbackName] = function(data) {
    if (completed) return;

    completed = true;
    clearTimeout(timeout);
    delete window[callbackName];

    if (!data || !data.success) {
      showError(data?.message || "データ取得に失敗しました。");
      return;
    }

    vehicles = Array.isArray(data.vehicles)
      ? data.vehicles
      : [];

    renderVehicles();
  };

  const script = document.createElement("script");

  script.id = "vehicle-api-script";
  script.src =
    API_URL +
    "?callback=" + callbackName +
    "&t=" + Date.now();

  script.onerror = () => {
    if (completed) return;

    completed = true;
    clearTimeout(timeout);
    delete window[callbackName];

    showError("APIへの接続に失敗しました。");
  };

  document.head.appendChild(script);
}

// カテゴリ変更
function changeCategory(category) {
  activeCategory = category;

  tabs.forEach(tab => {
    const isActive = tab.dataset.category === category;

    tab.classList.toggle("active", isActive);
    tab.setAttribute("aria-pressed", String(isActive));
  });

  currentCategory.textContent =
    categoryNames[category] || "ALL VEHICLES";

  renderVehicles();
}

// 車両表示
function renderVehicles() {
  errorMessage.hidden = true;

  const filtered = activeCategory === "ALL"
    ? vehicles
    : vehicles.filter(vehicle =>
        vehicle.category === activeCategory
      );

  vehicleCount.textContent = filtered.length;

  if (filtered.length === 0) {
    vehicleGrid.innerHTML = "";
    emptyMessage.hidden = false;
    return;
  }

  emptyMessage.hidden = true;

  vehicleGrid.innerHTML = filtered.map(vehicle => {
    const name = escapeHTML(vehicle.name);
    const category = escapeHTML(vehicle.category);
    const price = formatPrice(vehicle.price);
    const image = safeImageUrl(vehicle.image);

    return `
      <article class="vehicle-card">

        <div class="vehicle-image">

          ${
            image
              ? `
                <img
                  src="${escapeHTML(image)}"
                  alt="${name}"
                  loading="lazy"
                  onerror="this.style.display='none';this.nextElementSibling.hidden=false;"
                >
                <div class="image-placeholder" hidden>
                  LEMON VEHICLE
                </div>
              `
              : `
                <div class="image-placeholder">
                  LEMON VEHICLE
                </div>
              `
          }

          <span class="category-label">
            ${category}
          </span>

        </div>

        <div class="vehicle-content">

          <p class="vehicle-location">
            LOCATION / ${category}
          </p>

          <h3 class="vehicle-name">
            ${name}
          </h3>

          <div class="vehicle-price">
            <small>PRICE</small>
            <strong>${price}</strong>
          </div>

        </div>

      </article>
    `;
  }).join("");
}

// 価格フォーマット
function formatPrice(value) {
  const raw = String(value ?? "").trim();

  if (!raw) return "価格未設定";

  const numeric = Number(raw.replace(/[^\d.-]/g, ""));

  if (!Number.isFinite(numeric)) {
    return escapeHTML(raw);
  }

  return "¥" + numeric.toLocaleString("ja-JP");
}

// 画像URLの安全確認
function safeImageUrl(value) {
  const url = String(value || "").trim();

  if (!url) return "";

  try {
    const parsed = new URL(url);

    if (parsed.protocol !== "https:") return "";

    return parsed.href;
  } catch {
    return "";
  }
}

// HTMLエスケープ
function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[char];
  });
}

// エラー表示
function showError(message) {
  vehicleGrid.innerHTML = "";
  emptyMessage.hidden = true;
  errorMessage.hidden = false;

  const paragraph = errorMessage.querySelector("p");
  paragraph.textContent = message;
}
