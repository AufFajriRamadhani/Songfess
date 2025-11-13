// Firebase SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import {
  getAuth,
  signInAnonymously,
  signInWithCustomToken,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  query,
  onSnapshot,
  serverTimestamp,
  doc,
  deleteDoc,
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

console.log("script.js: Skrip mulai dimuat.");

// Variabel global Firebase (disediakan oleh environment)
const appId = typeof __app_id !== "undefined" ? __app_id : "default-app-id";
const firebaseConfig = {
  apiKey: "AIzaSyD79ABjlc2eaJxvJvQCczJtAuzscPKPrN0",
  authDomain: "project-cc-e28a8.firebaseapp.com",
  projectId: "project-cc-e28a8",
  storageBucket: "project-cc-e28a8.firebasestorage.app",
  messagingSenderId: "390693197657",
  appId: "1:390693197657:web:5fef7232885569eb57de48",
};
const initialAuthToken =
  typeof __initial_auth_token !== "undefined" ? __initial_auth_token : null;

// =================================================================================================
// PENTING: GANTI DENGAN KUNCI SPOTIFY API ANDA!
// =================================================================================================
const SPOTIFY_CLIENT_ID = "256ed70938184db7a0aacb88daa8b9a3"; // <--- GANTI INI
const SPOTIFY_CLIENT_SECRET = "94aec0f4b9c34695a27145665e877b0d"; // <--- GANTI INI

// =================================================================================================
// PENTING: GANTI DENGAN ID PLAYLIST SPOTIFY ANDA!
// =================================================================================================
const YOUR_SPOTIFY_PLAYLIST_ID = "0YIceDsDdwZBK6S7M1iUzL?"; // <--- GANTI INI

let spotifyAccessToken = "";
let selectedSpotifyTrackId = null;
let selectedSpotifyTrackName = "";

// Instance Firebase
let app;
let db;
let auth;
let isFirebaseReady = false;
let currentUserId = null;

// Mendapatkan referensi ke elemen UI
const navHomeBtn = document.getElementById("nav-home");
const navMessageBtn = document.getElementById("nav-message");
const navPlaylistBtn = document.getElementById("nav-playlist");
const navbar = document.getElementById("navbar");
const mainContentWrapper = document.getElementById("main-content-wrapper");

const homeSection = document.getElementById("home-section");
const messageSection = document.getElementById("message-section");
const playlistSection = document.getElementById("playlist-section");
const spotifyPlaylistEmbedDiv = document.getElementById(
  "spotify-playlist-embed"
);

const newMessageInput = document.getElementById("new-message-input");
const spotifySearchInput = document.getElementById("spotify-search-input");
const spotifySearchResultsDiv = document.getElementById(
  "spotify-search-results"
);
const senderNameInput = document.getElementById("sender-name-input");
const sendMessageBtn = document.getElementById("send-message-btn");
const messageErrorDisplay = document.getElementById("message-error");
const messagesContainer = document.getElementById("messages-container");
const displayUserIdSpan = document.getElementById("display-user-id");

// Elemen hamburger menu
const hamburgerBtn = document.getElementById("hamburger-btn");
const closeSidebarBtn = document.getElementById("close-sidebar-btn");
const overlay = document.getElementById("overlay");

console.log("script.js: Referensi elemen UI berhasil didapatkan.");

let currentPage = "home";

// --- Logika Navigasi ---
function navigateTo(page) {
  console.log(`Navigasi ke halaman: ${page}`);
  // Sembunyikan semua bagian
  homeSection.classList.add("hidden");
  messageSection.classList.add("hidden");
  playlistSection.classList.add("hidden");

  // Hapus kelas aktif dari semua tombol navigasi
  navHomeBtn.classList.remove("bg-blue-500", "text-white", "shadow-md");
  navMessageBtn.classList.remove("bg-blue-500", "text-white", "shadow-md");
  navPlaylistBtn.classList.remove("bg-blue-500", "text-white", "shadow-md");
  navHomeBtn.classList.add("text-gray-700", "hover:bg-gray-100");
  navMessageBtn.classList.add("text-gray-700", "hover:bg-gray-100");
  navPlaylistBtn.classList.add("text-gray-700", "hover:bg-gray-100");

  closeSidebar();

  mainContentWrapper.classList.remove("scale-100", "opacity-100");
  mainContentWrapper.classList.add("scale-95", "opacity-0");

  setTimeout(() => {
    switch (page) {
      case "home":
        homeSection.classList.remove("hidden");
        navHomeBtn.classList.add("bg-blue-500", "text-white", "shadow-md");
        navHomeBtn.classList.remove("text-gray-700", "hover:bg-gray-100");
        break;
      case "message":
        messageSection.classList.remove("hidden");
        navMessageBtn.classList.add("bg-blue-500", "text-white", "shadow-md");
        navMessageBtn.classList.remove("text-gray-700", "hover:bg-gray-100");
        break;
      case "playlist":
        playlistSection.classList.remove("hidden");
        navPlaylistBtn.classList.add("bg-blue-500", "text-white", "shadow-md");
        navPlaylistBtn.classList.remove("text-gray-700", "hover:bg-gray-100");
        renderSpotifyPlaylist();
        break;
    }
    currentPage = page;

    mainContentWrapper.classList.remove("scale-95", "opacity-0");
    mainContentWrapper.classList.add("scale-100", "opacity-100");
  }, 300);
}

// --- Logika Sidebar Mobile ---
function openSidebar() {
  navbar.classList.remove("translate-x-full");
  navbar.classList.add("translate-x-0", "navbar-open");
  overlay.classList.remove("hidden");
}

function closeSidebar() {
  navbar.classList.remove("translate-x-0", "navbar-open");
  navbar.classList.add("translate-x-full");
  overlay.classList.add("hidden");
}

// --- Inisialisasi dan Otentikasi Firebase ---
async function initFirebase() {
  try {
    if (!app) {
      app = initializeApp(firebaseConfig);
      db = getFirestore(app);
      auth = getAuth(app);

      onAuthStateChanged(auth, async (user) => {
        if (user) {
          currentUserId = user.uid;
          displayUserIdSpan.textContent = user.uid;
        } else {
          currentUserId = null;
          displayUserIdSpan.textContent = "Mencoba log masuk...";
        }
        isFirebaseReady = true;
        sendMessageBtn.disabled = !(isFirebaseReady && auth.currentUser);
        setupFirestoreListener();
      });

      if (initialAuthToken) {
        await signInWithCustomToken(auth, initialAuthToken);
      } else {
        await signInAnonymously(auth);
      }
    } else {
      isFirebaseReady = true;
      sendMessageBtn.disabled = !(isFirebaseReady && auth.currentUser);
      setupFirestoreListener();
    }
  } catch (error) {
    console.error("Kesalahan saat menginisialisasi Firebase:", error);
    messageErrorDisplay.textContent = `Gagal menyambung ke database: ${error.message}.`;
    messageErrorDisplay.classList.remove("hidden");
    isFirebaseReady = true;
    sendMessageBtn.disabled = true;
  }
}

// --- Logika Pesan Firestore ---
function setupFirestoreListener() {
  if (isFirebaseReady && db) {
    const messagesCollectionRef = collection(
      db,
      `artifacts/${appId}/public/data/mensive_messages` // Anda mungkin ingin mengubah "mensive_messages" menjadi "songfess_messages"
    );
    const q = query(messagesCollectionRef);

    onSnapshot(
      q,
      (snapshot) => {
        const messagesData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp
            ? doc.data().timestamp.toDate()
            : new Date(0),
        }));
        messagesData.sort(
          (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
        );
        renderMessages(messagesData);
      },
      (error) => {
        console.error("Kesalahan saat mengambil pesan:", error);
        messageErrorDisplay.textContent = `Gagal memuat pesan: ${error.message}.`;
        messageErrorDisplay.classList.remove("hidden");
      }
    );
  }
}

function renderMessages(messages) {
  messagesContainer.innerHTML = "";
  if (messages.length === 0) {
    messagesContainer.innerHTML =
      '<p class="text-gray-600">Belum ada pesan. Jadilah yang pertama!</p>';
  } else {
    messages.forEach((msg) => {
      const messageCard = document.createElement("div");
      messageCard.className =
        "bg-white p-6 rounded-2xl shadow-lg text-left transform transition-all duration-300 hover:scale-[1.02]";
      messageCard.innerHTML = `
                <p class="text-gray-800 text-lg leading-relaxed mb-3 whitespace-pre-wrap">${
                  msg.message
                }</p>
                ${
                  msg.spotifyTrackId
                    ? `
                    <div class="mt-4 mb-3">
                        <iframe
                            src="https://open.spotify.com/embed/track/${msg.spotifyTrackId}?utm_source=generator"
                            width="100%"
                            height="80"
                            frameBorder="0"
                            allowFullScreen=""
                            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                            loading="lazy"
                            title="Spotify Embed"
                            class="rounded-lg"
                        ></iframe>
                    </div>
                `
                    : ""
                }
                <p class="text-gray-600 text-sm font-medium">
                    — ${msg.sender}
                    ${
                      msg.timestamp
                        ? `
                        <span class="text-gray-500 ml-2 text-xs">
                            (${new Date(msg.timestamp).toLocaleDateString(
                              "id-ID",
                              {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )})
                        </span>
                    `
                        : ""
                    }
                </p>
            `;
      messagesContainer.appendChild(messageCard);
    });
  }
}

// --- Logika Spotify API ---
async function getSpotifyAccessToken() {
  if (
    SPOTIFY_CLIENT_ID === "GANTI_DENGAN_CLIENT_ID_SPOTIFY_ANDA" ||
    SPOTIFY_CLIENT_SECRET === "GANTI_DENGAN_CLIENT_SECRET_SPOTIFY_ANDA"
  ) {
    messageErrorDisplay.textContent =
      "Error Spotify: Harap masukkan Client ID dan Client Secret di script.js.";
    messageErrorDisplay.classList.remove("hidden");
    return;
  }

  try {
    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization:
          "Basic " + btoa(SPOTIFY_CLIENT_ID + ":" + SPOTIFY_CLIENT_SECRET),
      },
      body: "grant_type=client_credentials",
    });
    const data = await response.json();
    if (data.access_token) {
      spotifyAccessToken = data.access_token;
      messageErrorDisplay.classList.add("hidden");
    } else {
      messageErrorDisplay.textContent =
        "Gagal mendapatkan token Spotify. Pastikan Client ID dan Secret benar.";
      messageErrorDisplay.classList.remove("hidden");
    }
  } catch (error) {
    console.error("Kesalahan saat mengambil token Spotify:", error);
    messageErrorDisplay.textContent =
      "Terjadi kesalahan saat menyambung ke Spotify API.";
    messageErrorDisplay.classList.remove("hidden");
  }
}

async function searchSpotifyTracks(keyword) {
  if (!keyword.trim()) {
    spotifySearchResultsDiv.innerHTML = "";
    spotifySearchResultsDiv.classList.add("hidden");
    return;
  }
  if (!spotifyAccessToken) {
    await getSpotifyAccessToken();
    if (!spotifyAccessToken) return;
  }

  try {
    const response = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(
        keyword
      )}&type=track&limit=5`,
      {
        headers: {
          Authorization: "Bearer " + spotifyAccessToken,
        },
      }
    );
    const data = await response.json();
    if (response.status === 401) {
      // Token expired
      spotifyAccessToken = "";
      await getSpotifyAccessToken();
      if (spotifyAccessToken) {
        return searchSpotifyTracks(keyword);
      } else {
        messageErrorDisplay.textContent =
          "Token Spotify tidak valid. Coba muat ulang halaman.";
        messageErrorDisplay.classList.remove("hidden");
        return;
      }
    }
    renderSpotifySearchResults(data.tracks.items);
  } catch (error) {
    console.error("Kesalahan saat mencari Spotify:", error);
    messageErrorDisplay.textContent = "Gagal mencari lagu di Spotify.";
    messageErrorDisplay.classList.remove("hidden");
  }
}

function renderSpotifySearchResults(tracks) {
  spotifySearchResultsDiv.innerHTML = "";
  if (tracks.length === 0) {
    spotifySearchResultsDiv.innerHTML =
      '<p class="text-gray-600 text-sm p-2">Tidak ada hasil ditemukan.</p>';
    spotifySearchResultsDiv.classList.add("hidden");
    return;
  }

  const ul = document.createElement("ul");
  ul.className = "w-full";

  tracks.forEach((track) => {
    const li = document.createElement("li");
    li.className =
      "p-2 cursor-pointer hover:bg-blue-100 flex items-center border-b border-gray-100 last:border-b-0";
    li.innerHTML = `
            <img src="${
              track.album.images[0]?.url ||
              "https://placehold.co/50x50/cccccc/ffffff?text=No+Art"
            }" class="w-10 h-10 rounded-md mr-3" alt="Album Art">
            <div>
                <div class="font-medium text-gray-800">${track.name}</div>
                <div class="text-sm text-gray-600">${track.artists
                  .map((artist) => artist.name)
                  .join(", ")} - ${track.album.name}</div>
            </div>
        `;
    li.dataset.trackId = track.id;
    li.dataset.trackName = `${track.name} - ${track.artists
      .map((artist) => artist.name)
      .join(", ")}`;
    li.addEventListener("click", (e) => {
      selectedSpotifyTrackId = e.currentTarget.dataset.trackId;
      selectedSpotifyTrackName = e.currentTarget.dataset.trackName;
      spotifySearchInput.value = selectedSpotifyTrackName;
      spotifySearchResultsDiv.innerHTML = "";
      spotifySearchResultsDiv.classList.add("hidden");
    });
    ul.appendChild(li);
  });
  spotifySearchResultsDiv.appendChild(ul);
  spotifySearchResultsDiv.classList.remove("hidden");
}

let searchTimeout;
spotifySearchInput.addEventListener("input", () => {
  clearTimeout(searchTimeout);
  selectedSpotifyTrackId = null;
  selectedSpotifyTrackName = "";
  const keyword = spotifySearchInput.value;
  if (keyword.length > 2) {
    searchTimeout = setTimeout(() => {
      searchSpotifyTracks(keyword);
    }, 500);
  } else {
    spotifySearchResultsDiv.innerHTML = "";
    spotifySearchResultsDiv.classList.add("hidden");
  }
});

spotifySearchInput.addEventListener("blur", () => {
  setTimeout(() => {
    spotifySearchResultsDiv.innerHTML = "";
    spotifySearchResultsDiv.classList.add("hidden");
  }, 200);
});

sendMessageBtn.addEventListener("click", async () => {
  const newMessage = newMessageInput.value.trim();
  const senderName = senderNameInput.value.trim();
  const trackIdToSave = selectedSpotifyTrackId;

  if (!newMessage) {
    messageErrorDisplay.textContent = "Pesan tidak boleh kosong.";
    messageErrorDisplay.classList.remove("hidden");
    return;
  }

  if (!isFirebaseReady || !auth.currentUser) {
    messageErrorDisplay.textContent = "Database belum siap. Coba lagi.";
    messageErrorDisplay.classList.remove("hidden");
    return;
  }

  sendMessageBtn.disabled = true;
  messageErrorDisplay.classList.add("hidden");
  sendMessageBtn.innerHTML = `<svg class="animate-spin h-5 w-5 text-white mr-3" viewBox="0 0 24 24">
                                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg> Mengirim...`;

  try {
    const messagesCollectionRef = collection(
      db,
      `artifacts/${appId}/public/data/mensive_messages` // Anda mungkin ingin mengganti nama koleksi ini di Firebase
    );
    await addDoc(messagesCollectionRef, {
      message: newMessage,
      sender: senderName || "Anonim",
      spotifyTrackId: trackIdToSave,
      timestamp: serverTimestamp(),
      userId: auth.currentUser.uid,
    });
    newMessageInput.value = "";
    senderNameInput.value = "";
    spotifySearchInput.value = "";
    selectedSpotifyTrackId = null;
    selectedSpotifyTrackName = "";
  } catch (error) {
    console.error("Kesalahan saat menambahkan dokumen:", error);
    messageErrorDisplay.textContent = `Gagal mengirim pesan: ${error.message}.`;
    messageErrorDisplay.classList.remove("hidden");
  } finally {
    sendMessageBtn.disabled = false;
    sendMessageBtn.innerHTML = "Kirim Pesan";
  }
});

function renderSpotifyPlaylist() {
  if (YOUR_SPOTIFY_PLAYLIST_ID === "GANTI_DENGAN_ID_PLAYLIST_ANDA") {
    spotifyPlaylistEmbedDiv.innerHTML =
      '<p class="text-red-600">Harap masukkan ID Playlist Spotify di script.js.</p>';
    return;
  }
  spotifyPlaylistEmbedDiv.innerHTML = `
        <iframe
            src="https://open.spotify.com/embed/playlist/${YOUR_SPOTIFY_PLAYLIST_ID}?utm_source=generator"
            width="100%"
            height="100%"
            frameBorder="0"
            allowFullScreen=""
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            title="Spotify Playlist Embed"
        ></iframe>
    `;
}

window.onload = async () => {
  console.log("window.onload dipanggil.");
  initFirebase();
  await getSpotifyAccessToken();

  navbar.classList.remove("scale-95", "opacity-0");
  navbar.classList.add("scale-100", "opacity-100");

  mainContentWrapper.classList.remove("scale-95", "opacity-0");
  mainContentWrapper.classList.add("scale-100", "opacity-100");

  navigateTo("home");

  navHomeBtn.addEventListener("click", () => navigateTo("home"));
  navMessageBtn.addEventListener("click", () => navigateTo("message"));
  navPlaylistBtn.addEventListener("click", () => navigateTo("playlist"));

  // Event listeners untuk hamburger menu
  if (hamburgerBtn) {
    hamburgerBtn.addEventListener("click", openSidebar);
  }
  if (closeSidebarBtn) {
    closeSidebarBtn.addEventListener("click", closeSidebar);
  }
  if (overlay) {
    overlay.addEventListener("click", closeSidebar);
  }

  // Tutup sidebar saat item nav diklik (di mobile)
  document.querySelectorAll("#navbar button").forEach((button) => {
    button.addEventListener("click", () => {
      if (!window.matchMedia("(min-width: 768px)").matches) {
        closeSidebar();
      }
    });
  });
};
