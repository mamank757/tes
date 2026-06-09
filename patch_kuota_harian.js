/**
 * =============================================================================
 * PATCH KUOTA HARIAN PER MENU — SMART FARMING PPL MILENIAL WAJO
 * =============================================================================
 * Fungsi: membatasi penggunaan AI deteksi foto maksimal 10x PER MENU per hari
 * per perangkat (berbasis localStorage).
 *
 * Contoh: Penyakit 10x, Hama 10x, Gulma 10x, Tanah 10x, Panen 10x, BWD 10x
 * — masing-masing dihitung TERPISAH.
 *
 * Reset otomatis: setiap tengah malam (00:00) secara lokal
 *
 * Cara pakai: tambahkan di bagian paling bawah <body>:
 *   <script src="patch_kuota_harian.js"></script>
 * =============================================================================
 */

(function () {
    'use strict';

    // ── KONFIGURASI ──────────────────────────────────────────────────────────
    // Untuk mengubah batas, edit angka di sini saja
    var KUOTA_PER_MENU = {
        daun  : 5,   // Deteksi Penyakit Padi
        hama  : 5,   // Deteksi Hama Padi
        gulma : 5,   // Identifikasi Gulma
        tanah : 5,   // Analisis Tanah
        malai : 10,   // Estimasi Panen
        bwd   : 5    // Uji BWD Urea
    };

    var KEY_STORAGE = 'sf_kuota_v2';   // v2 agar tidak bentrok dengan patch lama
    var MODE_AI     = Object.keys(KUOTA_PER_MENU);

    // Label tampilan per mode
    var LABEL_MENU = {
        daun  : 'Penyakit',
        hama  : 'Hama',
        gulma : 'Gulma',
        tanah : 'Tanah',
        malai : 'Panen',
        bwd   : 'BWD'
    };

    // ── FUNGSI DATA KUOTA ────────────────────────────────────────────────────

    function ambilDataKuota() {
        var hariIni = new Date().toISOString().slice(0, 10);
        try {
            var raw = localStorage.getItem(KEY_STORAGE);
            if (raw) {
                var data = JSON.parse(raw);
                if (data.tanggal === hariIni) return data;
            }
        } catch (e) {}

        // Hari baru — buat struktur terpakai per menu, semua mulai dari 0
        var terpakai = {};
        MODE_AI.forEach(function (m) { terpakai[m] = 0; });
        var dataBaru = { tanggal: hariIni, terpakai: terpakai };
        simpanDataKuota(dataBaru);
        return dataBaru;
    }

    function simpanDataKuota(data) {
        try {
            localStorage.setItem(KEY_STORAGE, JSON.stringify(data));
        } catch (e) {}
    }

    /** Sisa kuota untuk satu menu tertentu */
    function sisaKuotaMenu(mode) {
        var data  = ambilDataKuota();
        var batas = KUOTA_PER_MENU[mode] || 10;
        var sudah = (data.terpakai[mode] || 0);
        return Math.max(0, batas - sudah);
    }

    /** Kurangi 1 kuota menu tertentu. Kembalikan true jika berhasil. */
    function pakaiSatuKuota(mode) {
        var data  = ambilDataKuota();
        var batas = KUOTA_PER_MENU[mode] || 10;
        if ((data.terpakai[mode] || 0) >= batas) return false;
        data.terpakai[mode] = (data.terpakai[mode] || 0) + 1;
        simpanDataKuota(data);
        return true;
    }

    /** Kembalikan 1 kuota jika gagal koneksi */
    function kembalikanSatuKuota(mode) {
        var data = ambilDataKuota();
        data.terpakai[mode] = Math.max(0, (data.terpakai[mode] || 0) - 1);
        simpanDataKuota(data);
    }

    // ── MODAL PERINGATAN ─────────────────────────────────────────────────────

    function tampilkanModalKuotaHabis(mode) {
        var label = LABEL_MENU[mode] || mode;
        var batas = KUOTA_PER_MENU[mode] || 10;
        var modalEl = document.getElementById('customAlertModal');
        var ikonEl  = document.getElementById('customAlertIcon');
        var pesanEl = document.getElementById('customAlertMessage');

        var pesanTeks =
            'Kuota menu ' + label.toUpperCase() + ' hari ini sudah habis.\n\n' +
            '📊 Batas harian menu ini: ' + batas + 'x\n' +
            '✅ Sudah terpakai: ' + batas + 'x\n' +
            '🔄 Reset otomatis: Tengah malam (00:00)\n\n' +
            'Menu AI lain masih bisa digunakan.\n' +
            'Silakan coba ' + label + ' lagi besok.';

        if (modalEl && pesanEl) {
            if (ikonEl) ikonEl.innerText = '🚫';
            pesanEl.innerText = pesanTeks;
            modalEl.style.display = 'flex';
        } else {
            alert(pesanTeks);
        }
    }

    // ── INDIKATOR KUOTA DI UI ────────────────────────────────────────────────

    function renderIndikatorKuota(modeAktif) {
        var elLama = document.getElementById('sf-kuota-bar');
        if (elLama) elLama.remove();

        // Hanya tampil saat berada di mode AI
        if (!modeAktif || !MODE_AI.includes(modeAktif)) return;

        var sisa   = sisaKuotaMenu(modeAktif);
        var batas  = KUOTA_PER_MENU[modeAktif] || 10;
        var label  = LABEL_MENU[modeAktif] || modeAktif;
        var persen = (sisa / batas) * 100;

        var warna;
        if      (sisa > 4) warna = '#10b981';
        else if (sisa > 2) warna = '#f59e0b';
        else if (sisa > 0) warna = '#ef4444';
        else               warna = '#7f1d1d';

        var teksStatus;
        if      (sisa === 0) teksStatus = label + ': Habis — reset tengah malam';
        else if (sisa <= 3)  teksStatus = label + ': Sisa ' + sisa + 'x — hampir habis!';
        else                 teksStatus = label + ': Sisa ' + sisa + 'x dari ' + batas + 'x';

        var bar = document.createElement('div');
        bar.id  = 'sf-kuota-bar';
        bar.style.cssText =
            'position:fixed;bottom:48px;left:0;right:0;z-index:500;' +
            'padding:6px 16px;background:rgba(11,21,40,0.92);' +
            'backdrop-filter:blur(6px);' +
            'border-top:1px solid rgba(255,255,255,0.06);' +
            'font-family:inherit;';

        bar.innerHTML =
            '<div style="display:flex;justify-content:space-between;' +
            'align-items:center;max-width:480px;margin:0 auto;gap:10px;">' +
                '<span style="font-size:11px;color:#94a3b8;white-space:nowrap;' +
                'font-weight:600;letter-spacing:0.5px;">📷 KUOTA DETEKSI HARI INI</span>' +
                '<div style="flex:1;height:6px;background:rgba(255,255,255,0.08);' +
                'border-radius:3px;overflow:hidden;">' +
                    '<div style="height:100%;width:' + persen + '%;' +
                    'background:' + warna + ';border-radius:3px;' +
                    'transition:width 0.4s ease;"></div>' +
                '</div>' +
                '<span style="font-size:11px;color:' + warna + ';' +
                'white-space:nowrap;font-weight:700;min-width:160px;' +
                'text-align:right;">' + teksStatus + '</span>' +
            '</div>';

        document.body.appendChild(bar);
    }

    // ── INTERCEPT mulaiAnalisis (daun, hama, gulma, tanah, malai) ────────────

    var _mulaiAnalisisAsli = window.mulaiAnalisis;
    window.mulaiAnalisis = async function () {
        var mode = window.currentMode;
        if (MODE_AI.includes(mode) && mode !== 'bwd') {
            if (sisaKuotaMenu(mode) <= 0) {
                tampilkanModalKuotaHabis(mode);
                return;
            }
            pakaiSatuKuota(mode);
            renderIndikatorKuota(mode);
        }
        return await _mulaiAnalisisAsli.apply(this, arguments);
    };

    // ── INTERCEPT tombol BWD (alur terpisah dari mulaiAnalisis) ─────────────

    var btnCapture = document.getElementById('btnCapture');
    if (btnCapture) {
        var btnBaru = btnCapture.cloneNode(true);
        btnCapture.parentNode.replaceChild(btnBaru, btnCapture);

        btnBaru.addEventListener('click', async function () {
            if (window.currentMode === 'bwd') {
                if (sisaKuotaMenu('bwd') <= 0) {
                    tampilkanModalKuotaHabis('bwd');
                    return;
                }
                pakaiSatuKuota('bwd');
                renderIndikatorKuota('bwd');
            }
            await jalankanCaptureBWD(this);
        });
    }

    async function jalankanCaptureBWD(btn) {
        var video  = document.getElementById('videoElement');
        var canvas = document.getElementById('hiddenCanvas');
        var ctx    = canvas.getContext('2d');

        if (!video || !video.videoWidth || !window.currentStream) {
            alert('Kamera belum siap, mohon tunggu sebentar.');
            return;
        }

        canvas.width  = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);

        var TARGET_BWD   = 640;
        var exportCanvas = document.createElement('canvas');
        var exportCtx    = exportCanvas.getContext('2d');
        exportCanvas.width  = TARGET_BWD;
        exportCanvas.height = TARGET_BWD;

        var srcSize = Math.min(video.videoWidth, video.videoHeight);
        var srcX    = (video.videoWidth  - srcSize) / 2;
        var srcY    = (video.videoHeight - srcSize) / 2;

        exportCtx.filter = 'brightness(1.05) contrast(1.1)';
        exportCtx.drawImage(canvas, srcX, srcY, srcSize, srcSize, 0, 0, TARGET_BWD, TARGET_BWD);

        var base64Img  = exportCanvas.toDataURL('image/jpeg', 0.82).split(',')[1];
        var previewImg = document.getElementById('bwdPreviewImage');
        if (previewImg) { previewImg.src = canvas.toDataURL('image/jpeg'); previewImg.style.display = 'block'; }

        var focusBox = document.getElementById('focusBox');
        if (focusBox) focusBox.style.display = 'none';

        var origText      = btn.innerText;
        btn.innerHTML     = 'MENGANALISIS AI...';
        btn.disabled      = true;
        btn.style.opacity = '0.7';

        var outputDiv = document.getElementById('outputBWD');
        outputDiv.innerHTML =
            '<div style="text-align:center;color:var(--accent-bwd);font-size:0.85rem;margin-top:15px;">' +
            '<div class="animasi-loading-kalender" style="color:var(--accent-bwd);">Menganalisis tingkat Nitrogen daun...</div></div>';

        try {
            var URL_BWD = window.URL_BWD ||
                'https://script.google.com/macros/s/AKfycbwGAPTPnLJyg-OtcbFt1aG_I2uy6FQjd-5eE2p1UuhQTde2lEbokpAquACyutg8kBDi/exec';
            var res  = await fetch(URL_BWD, { method: 'POST', body: JSON.stringify({ image: base64Img }) });
            var data = await res.json();
            if (typeof window.stopCamera === 'function') window.stopCamera();
            window.currentMode = 'bwd';
            if (typeof window.tampilkanHasil === 'function') window.tampilkanHasil(data);

        } catch (err) {
            console.error(err);
            outputDiv.innerHTML =
                '<div class="error" style="display:block;text-align:center;">Gagal memproses gambar. Periksa koneksi internet.</div>';
            if (previewImg) previewImg.style.display = 'none';
            if (focusBox)   focusBox.style.display   = 'block';
            // Kembalikan kuota jika gagal koneksi
            kembalikanSatuKuota('bwd');
            renderIndikatorKuota('bwd');

        } finally {
            btn.innerText     = origText;
            btn.disabled      = false;
            btn.style.opacity = '1';
        }
    }

    // ── UPDATE INDIKATOR SAAT GANTI MODE ────────────────────────────────────

    var _switchModeAsli = window.switchMode;
    window.switchMode = function (mode) {
        _switchModeAsli.apply(this, arguments);
        renderIndikatorKuota(mode);
    };

    // Tampilkan indikator saat load jika langsung di mode AI
    window.addEventListener('load', function () {
        renderIndikatorKuota(window.currentMode);
    });

    console.log(
        '%c✅ patch_kuota_harian.js (per menu) dimuat — masing-masing 10x/hari',
        'color: #f59e0b; font-weight: bold;'
    );

})();
