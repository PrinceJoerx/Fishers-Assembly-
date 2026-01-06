/// ===============================================
/// FISHERS ASSEMBLY CHURCH WEBSITE - MAIN SCRIPT
/// ===============================================

// --- 1. CONFIG & GLOBALS ---
const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTnaBYSw9R8urJ8N7U4QyUkGPf5zQonEVY4KdovOfDk0B-tyHN_dOiH1nI7fYxDQN1NhOgJZovZsjlm/pub?output=csv';
let allSermons = []; 
let isDismissed = false;
let countdownInterval = null;

// --- 2. INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    initSocialIcons();
    initSwiper();
    initBackToTopLogic(); 
    initReminderPopup(); 
    initTheme();
    initNewsletterForm();
    initContactForm();

    if (document.getElementById('countdown')) startCountdown();
    
    if (document.getElementById('featured-sermon-container')) {
        loadFeaturedSermon();
    }

    if (document.getElementById('blog-posts-container')) {
        loadChurchBlog();
        document.getElementById('sermonSearch')?.addEventListener('input', filterPosts);
        document.getElementById('categoryFilter')?.addEventListener('change', filterPosts);
    }

    if (document.getElementById('single-sermon-container')) {
        loadSingleSermon();
    }

    // Live Bar logic (Sundays 8 AM - 12 PM)
    const now = new Date();
    const liveBar = document.getElementById('live-bar');
    if (liveBar && now.getDay() === 0 && now.getHours() >= 8 && now.getHours() <= 12) {
        liveBar.classList.remove('hidden');
    }

    // Auto-collapse sidebar on small desktops
    const sidebar = document.getElementById('sidebar');
    if (sidebar && window.innerWidth > 768 && window.innerWidth <= 1100) {
        sidebar.classList.add('collapsed');
    }
});

// --- 3. HELPER FUNCTIONS ---
function parseCSV(text) {
    return text.split('\n').filter(line => line.trim());
}

function sanitize(str = "") {
    return str.replace(/[<>"']/g, "").trim();
}

function generateSlug(title) {
    return sanitize(title)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
}

function getQueryParam(name) {
    return new URLSearchParams(window.location.search).get(name);
}

// --- 4. DATA LOGIC (CSV Fetching) ---

async function loadChurchBlog() {
    const container = document.getElementById('blog-posts-container');
    try {
        const response = await fetch(CSV_URL);
        const data = await response.text();
        const rows = data.split('\n').slice(1);
        
        allSermons = rows.map(line => {
            const col = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
            return {
                title: sanitize(col[0] || ""),
                date: sanitize(col[1] || ""),
                category: sanitize(col[2] || "Sermon"),
                preacher: sanitize(col[3] || ""),
                content: sanitize(col[4] || ""),
                image: sanitize(col[5] || ""),
                audio: sanitize(col[6] || ""),
                video: sanitize(col[7] || ""),
                pdf: sanitize(col[8] || ""),
                isPopular: (col[9] || "").replace(/"/g, "").toUpperCase().includes("TRUE")
            };
        }).filter(s => s.title);
        
        displaySermons(allSermons);
        renderHistory(); 
        updateLastUpdatedTimestamp();
    } catch (e) { 
        console.error("Blog Load Error", e);
        if(container) container.innerHTML = `<p class="text-white text-center col-span-full">Error loading sermons.</p>`;
    }
}

async function loadFeaturedSermon() {
    const container = document.getElementById('featured-sermon-container');
    if (!container) return;
    try {
        const response = await fetch(CSV_URL);
        const data = await response.text();
        const rows = parseCSV(data).slice(1);

        if (rows.length === 0) return;

        const col = rows[0].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/); 
        if (col.length >= 6) {
            const title = sanitize(col[0]);
            const preacher = sanitize(col[3]);
            const content = sanitize(col[4]);
            const image = sanitize(col[5]);

            container.innerHTML = `
                <div class="relative group overflow-hidden rounded-3xl bg-gray-900 flex flex-col md:flex-row border border-white/5">
                    <div class="md:w-1/2 overflow-hidden"><img src="${image}" class="w-full h-full object-cover transition duration-500 group-hover:scale-110" alt="${title}"></div>
                    <div class="md:w-1/2 p-8 md:p-12 flex flex-col justify-center">
                        <span class="text-amber-500 font-bold text-sm uppercase mb-4 tracking-widest italic">Latest Release</span>
                        <h3 class="text-white text-4xl font-black mb-4 leading-tight">${title}</h3>
                        <p class="text-gray-400 mb-8 line-clamp-3 text-lg">${content}</p>
                        <div class="flex flex-wrap items-center gap-6">
                            <a href="blog.html" class="bg-amber-500 text-black px-8 py-3 rounded-full font-bold hover:bg-white transition flex items-center gap-2">READ FULL SERMON <i class="fa fa-arrow-right"></i></a>
                            <span class="text-white font-bold underline decoration-amber-500/50">By ${preacher}</span>
                        </div>
                    </div>
                </div>`;
        }
    } catch (e) { 
        console.error("Featured sermon failed", e); 
    }
}

async function loadSingleSermon() {
    const container = document.getElementById("single-sermon-container");
    if (!container) return;

    const slug = getQueryParam("s");
    if (!slug) {
        container.innerHTML = "<p class='text-center text-gray-400'>Sermon not found.</p>";
        return;
    }

    try {
        const res = await fetch(CSV_URL);
        const text = await res.text();
        const rows = text.split("\n").slice(1);

        const sermons = rows.map(line => {
            const col = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
            const title = sanitize(col[0] || "");
            return {
                title,
                slug: generateSlug(title),
                date: sanitize(col[1] || ""),
                category: sanitize(col[2] || "Sermon"),
                preacher: sanitize(col[3] || ""),
                content: sanitize(col[4] || ""),
                image: sanitize(col[5] || ""),
                audio: sanitize(col[6] || ""),
                video: sanitize(col[7] || ""),
                pdf: sanitize(col[8] || "")
            };
        }).filter(s => s.title);

        const sermon = sermons.find(s => s.slug === slug);
        if (!sermon) {
            container.innerHTML = "<p class='text-center text-gray-400'>Sermon not found.</p>";
            return;
        }

        document.title = sermon.title + " | Sermon";

        container.innerHTML = `
            <div class="max-w-4xl mx-auto">
                <img src="${sermon.image}" class="w-full rounded-3xl mb-6" alt="${sermon.title}">
                <p class="text-amber-500 text-xs font-bold uppercase">${sermon.category} • ${sermon.date}</p>
                <h1 class="text-white text-4xl font-black mt-2 mb-2">${sermon.title}</h1>
                <p class="text-gray-400 italic mb-6">By ${sermon.preacher}</p>

                <p class="text-gray-300 leading-relaxed mb-8">${sermon.content}</p>

                <div class="flex flex-wrap gap-3">
                    ${sermon.audio ? `<button onclick="playAudio('${sermon.audio}','${sermon.title}')" class="bg-amber-500 px-5 py-2 rounded-full font-bold text-black">Listen</button>` : ""}
                    ${sermon.video ? `<button onclick="openVideo('${sermon.video}')" class="bg-white/10 px-5 py-2 rounded-full text-white">Watch</button>` : ""}
                    ${sermon.pdf ? `<a href="${sermon.pdf}" target="_blank" class="bg-red-600/10 text-red-500 px-5 py-2 rounded-full">PDF Notes</a>` : ""}
                </div>
            </div>
        `;
    } catch (e) {
        console.error(e);
        container.innerHTML = "<p class='text-center text-gray-400'>Failed to load sermon.</p>";
    }
}

// --- 5. UI RENDERING ---

function displaySermons(posts) {
    const container = document.getElementById('blog-posts-container');
    if (!container) return;
    
    if (posts.length === 0) {
        container.innerHTML = `<p class="text-gray-500 italic text-center col-span-full">No messages found matching your search.</p>`;
        return;
    }

    container.innerHTML = posts.map(post => {
        return `
        <div class="bg-[#1e1e1e] rounded-2xl overflow-hidden border border-white/5 shadow-2xl transition hover:scale-[1.02] flex flex-col relative">
            
            ${post.isPopular ? `
                <div class="absolute top-4 left-4 z-20 flex items-center gap-1 bg-gradient-to-r from-amber-500 to-orange-600 text-black text-[10px] font-black px-3 py-1 rounded-full shadow-xl animate-bounce">
                    <i class="fa fa-fire"></i> MOST POPULAR
                </div>
            ` : ''}

            <div class="relative group">
                <img src="${post.image}" class="w-full h-56 object-cover" alt="${post.title}">
                ${post.video ? `
                    <button onclick="openVideo('${post.video}')" class="absolute inset-0 m-auto w-12 h-12 bg-red-600/90 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform scale-75 group-hover:scale-100">
                        <i class="fa fa-play"></i>
                    </button>` : ''}
            </div>

            <div class="p-6 flex-grow">
                <div class="flex justify-between text-[10px] font-bold uppercase mb-2 text-gray-500">
                    <span class="text-amber-500">${post.category}</span>
                    <span>${post.date}</span>
                </div>
                <h3 class="text-white text-xl font-bold mb-1">${post.title}</h3>
                <p class="text-gray-400 text-xs italic mb-4">By ${post.preacher}</p>
                
                <div class="grid grid-cols-2 gap-2 pt-4 border-t border-white/5">
                    ${post.audio ? `
                        <button onclick="playAudio('${post.audio}', '${post.title}')" class="bg-amber-500 hover:bg-amber-400 text-black py-2 rounded-lg text-[9px] font-black flex items-center justify-center gap-1 transition">
                             <i class="fa fa-headphones"></i> LISTEN
                        </button>` : ''}
                    
                    <button onclick="shareToWhatsApp('${post.title}', '${post.preacher}')" class="bg-green-600 hover:bg-green-500 text-white py-2 rounded-lg text-[9px] font-black flex items-center justify-center gap-1 transition">
                         <i class="fa fa-whatsapp text-sm"></i> WHATSAPP
                    </button>
                    
                    ${post.video ? `
                        <button onclick="openVideo('${post.video}')" class="bg-white/10 text-white hover:bg-white/20 py-2 rounded-lg text-[9px] font-black flex items-center justify-center gap-1 transition">
                             <i class="fa fa-video-camera"></i> WATCH
                        </button>` : ''}
                    
                    ${post.pdf ? `
                        <a href="${post.pdf}" target="_blank" class="bg-red-500/10 text-red-500 py-2 rounded-lg text-[9px] font-black flex items-center justify-center gap-1 hover:bg-red-500 hover:text-white transition text-center">
                            <i class="fa fa-file-pdf-o"></i> NOTES (PDF)
                        </a>` : ''}

                    <button onclick="showQR('${post.title}')" class="bg-white/5 text-gray-400 py-2 rounded-lg hover:text-white transition text-[9px] font-black flex items-center justify-center gap-1">
                        <i class="fa fa-qrcode text-sm"></i> QR CODE
                    </button>

                    <button onclick="copySermonLink('${post.title}')" class="bg-white/5 text-gray-400 py-2 rounded-lg hover:text-white transition text-[9px] font-black flex items-center justify-center gap-1">
                        <i class="fa fa-link"></i> COPY LINK
                    </button>
                    
                </div>
            </div>
        </div>
    `;
    }).join('');
}

// --- 6. MEDIA & HISTORY CONTROLS ---

function playAudio(url, title) {
    let player = document.getElementById('global-audio-player');
    if (!player) {
        player = document.createElement('div');
        player.id = 'global-audio-player';
        player.className = "fixed bottom-0 left-0 w-full bg-gray-900 border-t-2 border-amber-500 p-4 z-[9999] transform transition-transform duration-500 translate-y-full";
        player.innerHTML = `
            <div class="max-w-4xl mx-auto flex items-center gap-4">
                <div class="hidden md:block flex-1">
                    <p class="text-[10px] text-amber-500 font-bold uppercase tracking-widest">Now Playing</p>
                    <p id="player-title" class="text-white font-bold truncate text-sm"></p>
                </div>
                <audio id="main-audio-element" controls class="flex-[2] h-8"></audio>
                <button onclick="closeAudio()" class="text-gray-400 hover:text-white">✕</button>
            </div>`;
        document.body.appendChild(player);
    }
    const audio = document.getElementById('main-audio-element');
    document.getElementById('player-title').innerText = title;
    audio.src = url;
    player.classList.remove('translate-y-full');
    audio.play();

    saveToHistory({url, title, date: new Date().toLocaleDateString()});
    updateClickCount(title);
    
    setTimeout(handleChatVisibility, 100);
}

function closeAudio() {
    const player = document.getElementById('global-audio-player');
    const audio = document.getElementById('main-audio-element');
    if (audio) audio.pause();
    if (player) player.classList.add('translate-y-full');
    
    setTimeout(handleChatVisibility, 100);
}

function saveToHistory(sermon) {
    let history = JSON.parse(localStorage.getItem('sermonHistory') || '[]');
    history = history.filter(item => item.title !== sermon.title);
    history.unshift(sermon); 
    localStorage.setItem('sermonHistory', JSON.stringify(history.slice(0, 4))); 
    renderHistory();
}

function renderHistory() {
    const container = document.getElementById('recent-history-container');
    const list = document.getElementById('history-list');
    const history = JSON.parse(localStorage.getItem('sermonHistory') || '[]');

    if (!container || !list) return;

    if (history.length === 0) {
        container.classList.add('hidden');
        return;
    }

    container.classList.remove('hidden');
    list.innerHTML = history.map(item => `
        <button onclick="playAudio('${item.url}', '${item.title}')" 
                class="bg-white/5 hover:bg-amber-500 hover:text-black text-gray-400 py-2 px-4 rounded-full text-[10px] font-bold transition flex items-center gap-2 border border-white/5">
            <i class="fa fa-play-circle"></i> ${item.title}
        </button>
    `).join('');
}

function clearSermonHistory() {
    if (confirm("Do you want to clear your recently played sermons?")) {
        localStorage.removeItem('sermonHistory');
        const container = document.getElementById('recent-history-container');
        if (container) container.classList.add('hidden');
        showToast("History cleared");
    }
}

function updateClickCount(title) {
    let counts = JSON.parse(localStorage.getItem('sermonClicks') || '{}');
    counts[title] = (counts[title] || 0) + 1;
    localStorage.setItem('sermonClicks', JSON.stringify(counts));
}

// --- 7. SHARING & UTILITIES ---

function getSermonLink(title) {
    // Now returns blog.html instead of sermon page
    return `${location.origin}/blog.html`;
}

function shareToWhatsApp(title, preacher) {
    const link = getSermonLink(title);
    const message = `Check out this sermon: "${title}" by ${preacher}\n\nVisit our sermons page:\n${link}`;
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
}

function showQR(title) {
    // Changed to use blog.html instead of sermon.html
    const blogUrl = `${location.origin}/blog.html`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(blogUrl)}`;
    const qrModal = document.createElement('div');
    qrModal.className = "fixed inset-0 z-[10001] flex items-center justify-center bg-black/80 p-4";
    qrModal.onclick = () => qrModal.remove();
    qrModal.innerHTML = `
        <div class="bg-white p-6 rounded-2xl text-center" onclick="event.stopPropagation()">
            <h3 class="text-black font-bold mb-4">${title}</h3>
            <img src="${qrUrl}" alt="QR Code" class="mx-auto mb-4 border">
            <p class="text-gray-500 text-[10px]">Scan to view sermons on our blog page</p>
            <p class="text-gray-500 text-[10px] mt-2">Tap background to close</p>
        </div>
    `;
    document.body.appendChild(qrModal);
}

function openVideo(url) {
    const modal = document.getElementById('video-modal');
    const iframe = document.getElementById('video-iframe');
    if (modal && iframe) {
        let embedUrl = url.replace("watch?v=", "embed/");
        iframe.src = embedUrl;
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
}

function closeVideo() {
    const modal = document.getElementById('video-modal');
    const iframe = document.getElementById('video-iframe');
    if (iframe) iframe.src = "";
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

function copySermonLink(title) {
    const link = getSermonLink(title);
    navigator.clipboard.writeText(link).then(() => {
        showToast(`Blog page link copied!`);
    });
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast("Account Number Copied!"); 
    }).catch(err => {
        console.error('Failed to copy: ', err);
    });
}

// --- 8. UI INITIALIZERS ---

function initSocialIcons() {
    const gh = document.getElementById("telegram");
    const fb = document.getElementById("phone-call");
    const ig = document.getElementById("whatsapp");
    const tw = document.getElementById("gmail");
    const selector = document.getElementById("selector");

    if (gh && fb && ig && tw && selector) {
        const updateIcons = (activeBtn, offset) => {
            selector.style.transform = `translateX(${offset})`;
            [gh, fb, ig, tw].forEach(el => el.classList.replace("fill-white", "fill-[#75747A]"));
            activeBtn.classList.replace("fill-[#75747A]", "fill-white");
        };
        gh.onclick = () => updateIcons(gh, "0rem");
        fb.onclick = () => updateIcons(fb, "3.75rem");
        ig.onclick = () => updateIcons(ig, "7.5rem");
        tw.onclick = () => updateIcons(tw, "11.25rem");
    }
}

function initBackToTopLogic() {
    const arrowBtn = document.getElementById("backToTopContainer");
    const countdownBar = document.getElementById("countdown-wrapper");
    const closeBtn = document.getElementById("close-countdown");

    window.addEventListener('scroll', () => {
        const scrollPos = window.scrollY;
        if (scrollPos > 400) arrowBtn?.classList.add("show");
        else arrowBtn?.classList.remove("show");

        if (countdownBar && !isDismissed) {
            if (scrollPos < 100) {
                countdownBar.style.transform = "translateY(100%)";
                countdownBar.style.opacity = "0";
            } else {
                countdownBar.style.transform = "translateY(0)";
                countdownBar.style.opacity = "1";
            }
        }
        
        handleChatVisibility();
    });

    closeBtn?.addEventListener("click", () => {
        isDismissed = true;
        if (countdownBar) {
            countdownBar.style.transform = "translateY(100%)";
            countdownBar.style.opacity = "0";
        }
        if (arrowBtn) arrowBtn.style.bottom = "30px"; 
    });

    arrowBtn?.addEventListener("click", () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

function startCountdown() {
    const timerBox = document.getElementById('countdown');
    if (!timerBox) return;
    
    if (countdownInterval) clearInterval(countdownInterval);
    
    countdownInterval = setInterval(() => {
        const now = new Date();
        let nextService = new Date();
        nextService.setDate(now.getDate() + (7 - now.getDay()) % 7);
        nextService.setHours(17, 0, 0, 0);
        if (now > nextService) nextService.setDate(nextService.getDate() + 7);
        const diff = nextService - now;
        const d = Math.floor(diff / (1000 * 60 * 60 * 24));
        const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const m = Math.floor((diff / (1000 * 60)) % 60);
        const s = Math.floor((diff / 1000) % 60);
        const dDisp = d > 0 ? `${d}d ` : "";
        timerBox.innerText = `${dDisp}${h.toString().padStart(2, '0')}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`;
    }, 1000);
}

function initReminderPopup() {
    const reminderBtn = document.querySelector('#countdown-wrapper button.bg-white');
    const modal = document.getElementById('reminder-modal');
    const modalContent = document.getElementById('modal-content');
    const closeBtn = document.getElementById('close-modal');
    const googleBtn = document.getElementById('google-remind');

    if (!reminderBtn || !modal) return;
    
    reminderBtn.addEventListener('click', () => {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        setTimeout(() => modalContent?.classList.remove('scale-95', 'opacity-0'), 10);
    });
    
    const closeModal = () => {
        modalContent?.classList.add('scale-95', 'opacity-0');
        setTimeout(() => { 
            modal.classList.add('hidden'); 
            modal.classList.remove('flex'); 
        }, 300);
    };
    
    closeBtn?.addEventListener('click', closeModal);
    
    googleBtn?.addEventListener('click', () => {
        window.open(`https://www.google.com/calendar/render?action=TEMPLATE&text=Sunday+Service&details=Join+us!&location=Online&recur=RRULE:FREQ=WEEKLY;BYDAY=SU`, '_blank');
        closeModal();
    });
}

function filterPosts() {
    const s = document.getElementById('sermonSearch')?.value.toLowerCase() || "";
    const c = document.getElementById('categoryFilter')?.value || "all";
    const filtered = allSermons.filter(p => {
        const matchesSearch = p.title.toLowerCase().includes(s) || p.preacher.toLowerCase().includes(s);
        const matchesCategory = (c === 'all' || p.category === c);
        return matchesSearch && matchesCategory;
    });
    displaySermons(filtered);
}

function updateLastUpdatedTimestamp() {
    const el = document.getElementById('last-updated-text');
    if (el) el.innerText = `Updated ${new Date().toLocaleDateString()}`;
}

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    const bgColor = type === 'error' ? 'bg-red-500' : 'bg-amber-500';
    const textColor = type === 'error' ? 'text-white' : 'text-black';
    toast.className = `fixed bottom-24 left-1/2 -translate-x-1/2 ${bgColor} ${textColor} px-6 py-3 rounded-full font-bold z-[9999] shadow-lg`;
    toast.innerText = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function initSwiper() {
    try { 
        if (typeof Swiper !== 'undefined' && document.querySelector(".churchSwiper")) {
            new Swiper(".churchSwiper", { 
                slidesPerView: 1, 
                spaceBetween: 30, 
                loop: true, 
                autoplay: { delay: 4000 }, 
                breakpoints: { 
                    768: { slidesPerView: 2 }, 
                    1024: { slidesPerView: 3 } 
                } 
            }); 
        }
    } catch (e) {
        console.error('Swiper initialization error:', e);
    }
}

// --- 9. THEME TOGGLE LOGIC ---

function initTheme() {
    const themeToggle = document.getElementById('theme-toggle');
    if (!themeToggle) return;

    const currentTheme = localStorage.getItem('theme') || 'dark';

    document.documentElement.setAttribute('data-theme', currentTheme);
    updateToggleUI(currentTheme);

    themeToggle.addEventListener('click', () => {
        let theme = document.documentElement.getAttribute('data-theme');
        let newTheme = theme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateToggleUI(newTheme);
    });
}

function updateToggleUI(theme) {
    const icon = document.querySelector('#theme-icon i');
    const text = document.getElementById('theme-text');
    
    if (!icon) return;
    
    if (theme === 'light') {
        icon.className = 'fa fa-sun-o';
        if (text) text.innerText = 'Light Mode';
    } else {
        icon.className = 'fa fa-moon-o';
        if (text) text.innerText = 'Dark Mode';
    }
}

// --- 10. CHAT CONTROLS ---

function toggleChatWindow() {
    const chatWindow = document.getElementById('chat-window');
    const toggleIcon = document.getElementById('chat-toggle-icon');
    
    if (!chatWindow || !toggleIcon) return;
    
    if (chatWindow.classList.contains('hidden')) {
        chatWindow.classList.remove('hidden');
        chatWindow.classList.add('flex');
        toggleIcon.classList.replace('fa-whatsapp', 'fa-times');
    } else {
        chatWindow.classList.add('hidden');
        chatWindow.classList.remove('flex');
        toggleIcon.classList.replace('fa-times', 'fa-whatsapp');
    }
}

function handleChatVisibility() {
    const chatWrapper = document.getElementById('chat-wrapper');
    const audioPlayer = document.getElementById('global-audio-player');
    
    if (!chatWrapper) return;

    const scrollY = window.scrollY;
    const isAtTop = scrollY < 100;
    const isAudioPlaying = audioPlayer && !audioPlayer.classList.contains('translate-y-full');

    if (isAtTop || isAudioPlaying) {
        chatWrapper.style.opacity = "0";
        chatWrapper.style.pointerEvents = "none";
        chatWrapper.style.transform = "translateY(20px)";
    } else {
        chatWrapper.style.opacity = "1";
        chatWrapper.style.pointerEvents = "auto";
        chatWrapper.style.transform = "translateY(0)";
    }
}

// --- 11. GIVE MODAL ---

function openGiveModal() {
    const modal = document.getElementById('give-modal');
    const content = document.getElementById('give-modal-content');
    if (!modal || !content) return;

    modal.classList.remove('hidden');
    modal.classList.add('flex');

    requestAnimationFrame(() => {
        content.classList.remove('scale-95', 'opacity-0');
        content.classList.add('scale-100', 'opacity-100');
    });
}

function closeGiveModal() {
    const modal = document.getElementById('give-modal');
    const content = document.getElementById('give-modal-content');
    if (!modal || !content) return;

    content.classList.add('scale-95', 'opacity-0');
    content.classList.remove('scale-100', 'opacity-100');

    setTimeout(() => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }, 250);
}

function handleOnlineGive() {
    closeGiveModal();
    setTimeout(() => {
        showToast("Thank you for your generosity!");
    }, 1000);
}

// --- 12. SIDEBAR CONTROLS ---

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;

    const isMobile = window.innerWidth <= 768;

    if (isMobile) {
        sidebar.classList.toggle('active');
    } else {
        sidebar.classList.toggle('collapsed');
    }
}

function toggleDropdown(id) {
    const dropdown = document.getElementById(id);
    const arrow = document.getElementById('ministries-arrow');
    const sidebar = document.getElementById('sidebar');
    
    if (!dropdown) return;
    
    if (sidebar && sidebar.classList.contains('collapsed')) {
        sidebar.classList.remove('collapsed');
        setTimeout(() => {
            openDropdown(dropdown, arrow);
        }, 100);
    } else {
        openDropdown(dropdown, arrow);
    }
}

function openDropdown(dropdown, arrow) {
    if (!dropdown) return;
    
    if (dropdown.classList.contains('hidden')) {
        dropdown.classList.remove('hidden');
        setTimeout(() => {
            dropdown.classList.add('open');
        }, 10);
        if (arrow) arrow.style.transform = 'rotate(180deg)';
    } else {
        dropdown.classList.remove('open');
        if (arrow) arrow.style.transform = 'rotate(0deg)';
        setTimeout(() => {
            dropdown.classList.add('hidden');
        }, 300);
    }
}

// --- 13. WINDOW RESIZE HANDLER ---

window.addEventListener('resize', () => {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;

    if (window.innerWidth <= 768) {
        sidebar.classList.remove('collapsed');
    }
});

// --- 14. NEWSLETTER FORM HANDLER ---

function initNewsletterForm() {
    const newsletterForm = document.getElementById("newsletter-form");
    
    if (!newsletterForm) return;

    newsletterForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        
        const btn = newsletterForm.querySelector('button');
        const originalBtnText = btn.innerHTML;
        
        btn.disabled = true;
        btn.innerHTML = `<i class="fa fa-spinner fa-spin"></i> SAVING...`;

        const data = new FormData(event.target);

        try {
            const response = await fetch(event.target.action, {
                method: 'POST',
                body: data,
                headers: { 'Accept': 'application/json' }
            });

            if (response.ok) {
                showToast("Blessings! Redirecting to our community...");
                newsletterForm.reset();
                
                // Open WhatsApp after 2 seconds
                setTimeout(() => {
                    const welcomeText = encodeURIComponent(
                        "Hello Fishers Assembly! I just subscribed to your newsletter and would like to stay connected."
                    );
                    window.open(`https://wa.me/2348034623529?text=${welcomeText}`, '_blank');
                }, 2000);
            } else {
                const result = await response.json();
                showToast(result.message || "Could not subscribe. Try again.", "error");
            }
        } catch (error) {
            console.error("Newsletter submission error:", error);
            showToast("Connection failed. Please check your internet.", "error");
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalBtnText;
        }
    });
}

// --- 15. CONTACT FORM HANDLER ---

function initContactForm() {
    const contactForm = document.getElementById('church-contact-form');
    const wrapper = document.getElementById('form-wrapper');

    if (!contactForm) return;

    contactForm.addEventListener('submit', function(e) {
        e.preventDefault();

        const btn = document.getElementById('submit-btn');
        const originalBtnText = btn.innerHTML;
        const formData = new FormData(contactForm);
        
        btn.disabled = true;
        btn.innerHTML = `
            <div class="flex items-center gap-2">
                <i class="fa fa-spinner fa-spin"></i> SENDING...
            </div>
        `;

        fetch('https://api.web3forms.com/submit', {
            method: 'POST',
            body: formData
        })
        .then(async (response) => {
            const result = await response.json();
            
            if (result.success) {
                if (wrapper) {
                    wrapper.innerHTML = `
                        <div class="text-center py-12 animate-fade-in">
                            <div class="w-20 h-20 bg-amber-500/20 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6">
                                <i class="fa fa-check text-3xl"></i>
                            </div>
                            <h2 class="text-2xl font-black text-white mb-3">Message Received!</h2>
                            <p class="text-gray-400 mb-8 px-4">
                                Blessings to you. Your request has been sent to our ministers. 
                                We will stand in agreement with you and respond shortly.
                            </p>
                            <button onclick="location.reload()" class="text-amber-500 font-bold hover:text-amber-400 underline">
                                Send another message
                            </button>
                        </div>
                    `;
                }
            } else {
                showToast("Error: " + result.message, "error");
                btn.disabled = false;
                btn.innerHTML = originalBtnText;
            }
        })
        .catch(error => {
            console.error("Contact form error:", error);
            showToast("Connection failed. Please check your internet.", "error");
            btn.disabled = false;
            btn.innerHTML = originalBtnText;
        });
    });
}