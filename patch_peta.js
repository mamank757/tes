<script>
(function() {
    // Simpan posisi asli wrapper di DOM
    let _placeholderAsli = null;
    let _isFullscreen = false;

    function masukFullscreenPeta() {
        if (_isFullscreen) return;
        _isFullscreen = true;

        const wrapper  = document.getElementById('wrapperRadarMap');
        const placeholder = document.getElementById('placeholderRadarMap');
        const btnFS    = document.getElementById('btnFullscreenPeta');
        const btnTutup = document.getElementById('btnTutupFullscreenPeta');

        // Simpan referensi placeholder (penanda posisi asli)
        _placeholderAsli = placeholder;

        // ★ KUNCI: Pindahkan wrapper langsung ke body
        // Ini memutus semua rantai CSS parent yang memblokir fixed di mobile
        document.body.appendChild(wrapper);

        // Terapkan gaya fullscreen
        wrapper.classList.add('is-fullscreen');

        // Tampilkan tombol tutup
        btnTutup.classList.add('visible');

        // Ubah tampilan tombol header
        if (btnFS) {
            btnFS.textContent = '✕ KELUAR';
            btnFS.style.background = 'rgba(239,68,68,0.15)';
            btnFS.style.borderColor = 'rgba(239,68,68,0.5)';
            btnFS.style.color = '#ef4444';
        }

        // Blokir scroll background
        document.body.style.overflow = 'hidden';

        // Paksa iframe reload agar render ulang di ukuran baru
        const iframe = document.getElementById('radarMap');
        if (iframe && iframe.src) {
            const srcLama = iframe.src;
            iframe.src = '';
            setTimeout(() => { iframe.src = srcLama; }, 50);
        }
    }

    function keluarFullscreenPeta() {
        if (!_isFullscreen) return;
        _isFullscreen = false;

        const wrapper  = document.getElementById('wrapperRadarMap');
        const btnFS    = document.getElementById('btnFullscreenPeta');
        const btnTutup = document.getElementById('btnTutupFullscreenPeta');

        // Cabut gaya fullscreen
        wrapper.classList.remove('is-fullscreen');

        // ★ KUNCI: Kembalikan wrapper ke posisi aslinya
        if (_placeholderAsli && _placeholderAsli.parentNode) {
            _placeholderAsli.parentNode.insertBefore(wrapper, _placeholderAsli.nextSibling);
        }

        // Sembunyikan tombol tutup
        btnTutup.classList.remove('visible');

        // Kembalikan tombol header
        if (btnFS) {
            btnFS.textContent = '⛶ FULLSCREEN';
            btnFS.style.background = 'rgba(0,255,136,0.12)';
            btnFS.style.borderColor = 'rgba(0,255,136,0.4)';
            btnFS.style.color = '#00ff88';
        }

        // Kembalikan scroll
        document.body.style.overflow = '';

        _placeholderAsli = null;
    }

    // Expose ke global agar onclick di HTML bisa memanggil
    window.masukFullscreenPeta = masukFullscreenPeta;
    window.keluarFullscreenPeta = keluarFullscreenPeta;

    // ESC untuk keluar (desktop)
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && _isFullscreen) keluarFullscreenPeta();
    });

    // Swipe down untuk keluar di mobile (opsional tapi nyaman)
    let _touchStartY = 0;
    document.addEventListener('touchstart', function(e) {
        _touchStartY = e.touches[0].clientY;
    }, { passive: true });

    document.addEventListener('touchend', function(e) {
        if (!_isFullscreen) return;
        const deltaY = e.changedTouches[0].clientY - _touchStartY;
        // Swipe ke bawah lebih dari 80px → keluar fullscreen
        if (deltaY > 80) keluarFullscreenPeta();
    }, { passive: true });
})();
</script>
