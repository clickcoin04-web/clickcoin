(function () {

  function init() {

    const TELEGRAM_LINK = "https://t.me/clickcoinsite_official_bot";

    // ===== STYLE (FUTURISTIC UI) =====
    const style = document.createElement("style");
    style.innerHTML = `
      #tg-float {
        position: fixed;
        right: 20px;
        top: 50%;
        transform: translateY(-50%);
        z-index: 9999;
      }

      #tg-btn {
        width: 65px;
        height: 65px;
        border-radius: 50%;
        background: linear-gradient(135deg, #00c6ff, #0072ff);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        box-shadow: 0 0 15px rgba(0, 140, 255, 0.6),
                    0 0 30px rgba(0, 140, 255, 0.4);
        animation: pulseGlow 2s infinite;
        transition: 0.3s;
      }

      #tg-btn:hover {
        transform: scale(1.15);
        box-shadow: 0 0 25px rgba(0, 140, 255, 0.9),
                    0 0 45px rgba(0, 140, 255, 0.6);
      }

      #tg-btn::before {
        content: "";
        position: absolute;
        width: 90px;
        height: 90px;
        border-radius: 50%;
        border: 2px solid rgba(0, 140, 255, 0.3);
        animation: ripple 2.5s infinite;
      }

      #tg-btn svg {
        width: 20px;
        height: 20px;
        fill: white;
      }

      @keyframes pulseGlow {
        0% { box-shadow: 0 0 10px rgba(0,140,255,0.5); }
        50% { box-shadow: 0 0 25px rgba(0,140,255,1); }
        100% { box-shadow: 0 0 10px rgba(0,140,255,0.5); }
      }

      @keyframes ripple {
        0% {
          transform: scale(0.8);
          opacity: 0.7;
        }
        100% {
          transform: scale(1.5);
          opacity: 0;
        }
      }

      #tg-popup {
        position: fixed;
        right: 100px;
        top: 50%;
        transform: translateY(-50%);
        background: rgba(20, 25, 40, 0.95);
        backdrop-filter: blur(10px);
        padding: 18px;
        border-radius: 12px;
        width: 230px;
        box-shadow: 0 0 20px rgba(0,140,255,0.4);
        display: none;
        z-index: 9999;
        color: white;
        font-family: Arial, sans-serif;
        animation: fadeIn 0.3s ease;
      }

      #tg-popup h4 {
        margin: 0 0 8px;
        font-size: 16px;
        color: #00c6ff;
      }

      #tg-popup p {
        margin: 0 0 12px;
        font-size: 13px;
        opacity: 0.85;
      }

      #tg-popup button {
        width: 100%;
        padding: 10px;
        background: linear-gradient(135deg, #00c6ff, #0072ff);
        color: white;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        transition: 0.3s;
      }

      #tg-popup button:hover {
        transform: scale(1.05);
        box-shadow: 0 0 10px #00c6ff;
      }

      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(-60%); }
        to { opacity: 1; transform: translateY(-50%); }
      }
    `;
    document.head.appendChild(style);

    // ===== FLOAT BUTTON =====
    const float = document.createElement("div");
    float.id = "tg-float";
    float.innerHTML = `
      <div id="tg-btn">
        <!-- HEADSET ICON (customer support style) -->
        <svg viewBox="0 0 24 24">
          <path d="M12 1a9 9 0 00-9 9v5a3 3 0 003 3h1v-6H5v-2a7 7 0 0114 0v2h-2v6h1a3 3 0 003-3v-5a9 9 0 00-9-9z"/>
        </svg>
      </div>
    `;
    document.body.appendChild(float);

    // ===== POPUP =====
    const popup = document.createElement("div");
    popup.id = "tg-popup";
    popup.innerHTML = `
      <h4>Customer Support</h4>
      <p>We're online. Chat with us now 🚀</p>
      <button id="tg-open">Continue on Telegram</button>
    `;
    document.body.appendChild(popup);

    // ===== EVENTS =====
    const btn = document.getElementById("tg-btn");
    const openBtn = document.getElementById("tg-open");

    btn.onclick = () => {
      popup.style.display =
        popup.style.display === "block" ? "none" : "block";
    };

    openBtn.onclick = () => {
      window.open(TELEGRAM_LINK, "_blank");
    };
  }

  // SAFE LOAD
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();