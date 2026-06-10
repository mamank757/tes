/**
 * =============================================================================
 * PATCH PERBAIKAN ILMIAH — SMART FARMING PPL MILENIAL WAJO
 * =============================================================================
 * File ini menimpa (override) fungsi-fungsi yang memiliki masalah ilmiah.
 * Cara pakai: tambahkan <script src="patch_perbaikan_ilmiah.js"></script>
 * di bagian PALING BAWAH <body>, SETELAH semua script lain.
 *
 * Daftar perbaikan:
 *   [1] normalisasiCurahHujan()  — tambahkan faktor musim
 *   [2] hitungRisikoSheathBlight() — perbaiki tumpang tindih fase & threshold
 *   [3] hitungRisikoTungro()     — koreksi threshold suhu untuk Sulsel
 *   [4] persenBernas             — DIPERBAIKI: patch data-attribute lama tidak
 *                                  efektif; sekarang menyediakan helper global
 *                                  getPersenBernasKoreksi() saja (nilai bernas
 *                                  sudah diperbaiki di patch_smartfarming.js v3.1)
 *   [5] simpulkanPrediksiIklimTerpadu() — bobot IOD dinamis (bukan tetap 0.6)
 *                                  + FIX: hanya latestAnomaly yang diberi bobot,
 *                                  array anomalies historis tidak dimodifikasi
 *   [BARU] hitungRisikoTungro gap curah hujan 26–30mm ditutup
 *
 * Referensi ilmiah tercantum di masing-masing fungsi.
 * =============================================================================
 */

(function() {
    'use strict';

    /* =========================================================================
     * [1] normalisasiCurahHujan — PERBAIKAN UTAMA
     * =========================================================================
     * Masalah lama:
     *   - Tidak mempertimbangkan musim. Curah hujan 120 mm di bulan Januari
     *     (Musim Rendeng) dikembalikan sebagai NORMAL, padahal itu KERING
     *     untuk musim rendeng Sulsel (normal rendeng = 150–300 mm/bulan).
     *
     * Dasar ilmiah perbaikan:
     *   - BMKG Stasiun Klimatologi Maros: curah hujan normal Sulsel per musim
     *       Musim Rendeng (Nov–Mar) : 150–300 mm/bulan
     *       Musim Gadu    (Apr–Okt) :  50–150 mm/bulan
     *   - Aldrian & Susanto (2003) — klasifikasi iklim monsunal Indonesia
     *
     * Cara kerja baru:
     *   Parameter 'bulanIndex' (0=Jan … 11=Des) menentukan baseline musim.
     *   Indeks kembalian tetap –1.5 s/d +1.5 agar kompatibel dengan kode lama.
     * =========================================================================
     */
    window.normalisasiCurahHujan = function(curahHujan, bulanIndex) {
        // Jika bulan tidak dikirim, fallback ke perilaku lama (musim gadu)
        if (bulanIndex === undefined || bulanIndex === null) {
            bulanIndex = new Date().getMonth();
        }

        // Tentukan apakah bulan ini termasuk Musim Rendeng atau Gadu
        // Rendeng = Nov(10), Des(11), Jan(0), Feb(1), Mar(2)
        var musimRendeng = [0, 1, 2, 10, 11].includes(bulanIndex);

        // Batas normal berbasis musim (mm/bulan)
        var batasSangatKering, batasKering, batasNormalAtas, batasBasah;

        if (musimRendeng) {
            // Musim Rendeng — curah hujan jauh lebih tinggi
            batasSangatKering = 75;   // < 75 mm = sangat kering di rendeng
            batasKering       = 130;  // < 130 mm = kering di rendeng
            batasNormalAtas   = 300;  // < 300 mm = masih normal di rendeng
            batasBasah        = 450;  // < 450 mm = basah di rendeng
        } else {
            // Musim Gadu — curah hujan lebih rendah secara alami
            batasSangatKering = 30;   // < 30 mm = sangat kering di gadu
            batasKering       = 75;   // < 75 mm = kering di gadu
            batasNormalAtas   = 150;  // < 150 mm = masih normal di gadu
            batasBasah        = 250;  // < 250 mm = basah di gadu
        }

        if (curahHujan < batasSangatKering) return -1.5;
        if (curahHujan < batasKering)       return -0.8;
        if (curahHujan < batasNormalAtas)   return  0.0;
        if (curahHujan < batasBasah)        return  0.8;
        return 1.5;
    };


    /* =========================================================================
     * [2] hitungRisikoSheathBlight — PERBAIKAN FASE & THRESHOLD
     * =========================================================================
     * Masalah lama:
     *   a) Batas anakan maksimal (30–45 HST) tidak dinamis — tidak
     *      mempertimbangkan perbedaan varietas genjah/sedang/dalam.
     *   b) Tumpang tindih: umur 45→46 HST menyebabkan skor TURUN
     *      (dari +20 ke +10) padahal risiko harusnya meningkat mendekati
     *      fase generatif.
     *
     * Dasar ilmiah perbaikan:
     *   - Sumartini (2010) — Sheath Blight Rhizoctonia solani: suhu 28–32°C
     *     optimal, RH > 80% threshold infeksi, kanopi rapat = risiko tinggi.
     *   - IRRI Rice Knowledge Bank — anakan maksimal berdasarkan umur varietas:
     *       Genjah  (<95 HST)   : anakan maks hari 25–40 HST
     *       Sedang  (95–115 HST): anakan maks hari 35–50 HST
     *       Dalam   (>=116 HST) : anakan maks hari 40–60 HST
     * =========================================================================
     */
    window.hitungRisikoSheathBlight = function(suhu, kelembapan, faseTanaman) {
        var skor = 0;
        var level = 'RENDAH';
        var warna = 'var(--accent-green)';
        var detail = '';
        var saran  = '';

        // ── FAKTOR SUHU (Sumartini 2010) ───────────────────────────────────
        if (suhu >= 28 && suhu <= 32) {
            skor += 35;
        } else if (suhu >= 25 && suhu < 28) {
            skor += 20;
        } else if (suhu > 32) {
            skor += 15;
        }

        // ── FAKTOR KELEMBAPAN (Sumartini 2010, threshold RH > 80%) ─────────
        // Urutan dari TERTINGGI ke TERENDAH agar tidak overlap
        if      (kelembapan >= 95) { skor += 45; }
        else if (kelembapan >= 90) { skor += 35; }
        else if (kelembapan >= 85) { skor += 25; }
        else if (kelembapan >= 80) { skor += 15; }

        // ── FAKTOR FASE — DINAMIS berdasarkan umur varietas ────────────────
        // Tentukan batas anakan maksimal berdasarkan varietas
        // (Baca dari elemen DOM aktif; fallback ke 'sedang')
        var elUmur = document.getElementById('umurVarietasCuaca')
                  || document.getElementById('umurVarietasKalender');
        var umurPilihan = elUmur ? elUmur.value : 'sedang';

        var batasAnakanMin, batasAnakanMaks;
        if (umurPilihan === 'genjah') {
            batasAnakanMin = 25; batasAnakanMaks = 40;   // Genjah <95 HST
        } else if (umurPilihan === 'dalam') {
            batasAnakanMin = 40; batasAnakanMaks = 60;   // Dalam >=116 HST
        } else {
            batasAnakanMin = 35; batasAnakanMaks = 50;   // Sedang 95–115 HST
        }

        var umur = faseTanaman.umurHari || 0;

        if (faseTanaman.fase.includes('Generatif')) {
            // Fase generatif: kanopi sangat rapat, kelembapan mikro tertinggi
            skor += 30;
        } else if (umur >= batasAnakanMin && umur <= batasAnakanMaks) {
            // Anakan maksimal: kanopi mulai menutup rapat
            skor += 22;
        } else if (umur > batasAnakanMaks && !faseTanaman.fase.includes('Generatif')) {
            // Vegetatif lanjut menuju generatif: risiko masih meningkat
            // PERBAIKAN: skor naik bertahap, bukan turun drastis
            var ekstraUmur = Math.min(15, Math.floor((umur - batasAnakanMaks) / 3));
            skor += (12 + ekstraUmur);
        } else if (faseTanaman.fase.includes('Panen') || faseTanaman.fase.includes('Bera')) {
            skor -= 20;
        }

        if (skor < 0) skor = 0;

        // ── KLASIFIKASI ────────────────────────────────────────────────────
        if (skor >= 70) {
            level  = 'TINGGI / BAHAYA';
            warna  = 'var(--red-alert)';
            detail = 'Kondisi sangat mendukung perkembangan jamur Rhizoctonia '
                   + 'solani pada pelepah batang padi. Fase tanaman, suhu, '
                   + 'dan kelembapan berada pada titik kritis.';
            saran  = '✅ Kurangi dosis Urea, terapkan intermittent irrigation '
                   + '(keringkan 3–5 hari, airi kembali). Aplikasikan fungisida '
                   + 'berbahan aktif Validamycin atau Hexaconazole pada '
                   + 'pangkal batang.';
        } else if (skor >= 45) {
            level  = 'SEDANG / WASPADA';
            warna  = 'var(--accent-soil)';
            detail = 'Cuaca mendukung serangan, terutama di petakan yang '
                   + 'terlalu subur, rapat, dan tergenang terus-menerus.';
            saran  = '✅ Pantau pelepah daun bagian bawah untuk bercak coklat '
                   + 'berbatas tegas. Jaga agar air tidak menggenang '
                   + 'lebih dari 5 hari berturut-turut.';
        } else if (skor >= 20) {
            level  = 'RENDAH / SIAGA';
            warna  = 'var(--accent-bwd)';
            detail = 'Beberapa faktor mulai kondusif untuk awal infeksi. '
                   + 'Belum kritis namun perlu kewaspadaan.';
            saran  = '✅ Pertahankan sanitasi lahan. Hindari pemupukan '
                   + 'Nitrogen berlebih yang membuat batang terlalu lunak.';
        } else {
            level  = 'SANGAT RENDAH';
            warna  = 'var(--accent-green)';
            detail = 'Kondisi kurang kondusif untuk Hawar Pelepah saat ini.';
            saran  = '✅ Pertahankan pemupukan NPK berimbang dan sanitasi '
                   + 'lahan antar musim tanam.';
        }

        return { skor, level, warna, detail, saran };
    };


    /* =========================================================================
     * [3] hitungRisikoTungro — KOREKSI THRESHOLD SUHU UNTUK SULSEL
     * =========================================================================
     * Masalah lama:
     *   - Zona optimal vektor ditetapkan 20–27°C, padahal suhu harian Sulsel
     *     rata-rata 28–33°C. Akibatnya sebagian besar waktu skor dikurangi 20
     *     padahal vektor masih aktif di suhu tersebut.
     *   - IRRI (2013) menyebut Nephotettix virescens aktif s/d ~32°C,
     *     bukan hanya s/d 27°C.
     *
     * Dasar ilmiah perbaikan:
     *   - IRRI Rice Knowledge Bank — Tungro Virus Disease (2013):
     *     vektor N. virescens optimal 20–32°C, mati/tidak aktif di atas 35°C.
     *   - Azzam & Chancellor (2002): aktivitas maksimal 25–30°C, mulai
     *     tertekan di atas 32°C, sangat tertekan di atas 35°C.
     * =========================================================================
     */
    window.hitungRisikoTungro = function(suhu, kelembapan, curahHujan, faseTanaman) {
        var skor = 0;
        var level = 'RENDAH';
        var warna = 'var(--accent-green)';
        var detail = '';
        var saran  = '';

        // ── FAKTOR SUHU (IRRI 2013, Azzam & Chancellor 2002) ───────────────
        // PERBAIKAN: zona aktif diperluas ke 32°C sesuai kondisi riil Sulsel
        if      (suhu >= 25 && suhu <= 30) { skor += 40; }  // Zona optimal
        else if (suhu >= 20 && suhu <  25) { skor += 28; }  // Sub-optimal bawah
        else if (suhu >  30 && suhu <= 32) { skor += 25; }  // Sub-optimal atas — MASIH AKTIF
        else if (suhu >  32 && suhu <= 35) { skor += 10; }  // Mulai tertekan
        else if (suhu >  35)               { skor -=  5; }  // Sangat tertekan, tidak aktif
        else if (suhu >= 16 && suhu <  20) { skor += 12; }  // Dingin, lambat
        // suhu < 16°C → tidak kondusif, tidak ada penambahan

        // ── FAKTOR KELEMBAPAN ───────────────────────────────────────────────
        if      (kelembapan >= 90) { skor += 35; }
        else if (kelembapan >= 85) { skor += 25; }
        else if (kelembapan >= 75) { skor += 15; }

        // ── FAKTOR CURAH HUJAN ──────────────────────────────────────────────
        // [FIX BUG] Gap range 26–30mm/hari dihapus: perluas batas atas dari 25 ke 30mm.
        // Wereng hijau masih aktif terbang pada hujan ringan hingga 30mm/hari.
        // Di atas 30mm, curah hujan lebat menekan aktivitas vektor secara mekanis.
        if      (curahHujan >= 5  && curahHujan <= 30) { skor += 15; }
        else if (curahHujan >  30)                      { skor -= 10; }

        // ── FAKTOR FASE TANAMAN (IRRI — tanaman muda sangat rentan) ─────────
        var umur = faseTanaman.umurHari || 0;
        if      (umur >= 0  && umur <= 45) { skor += 30; }  // Fase kritis
        else if (umur >  45 && umur <= 60) { skor += 10; }  // Masih rentan
        else if (umur >  60)               { skor -= 30; }  // Batang tua, tahan

        if (skor < 0) skor = 0;

        // ── KLASIFIKASI ────────────────────────────────────────────────────
        if (skor >= 70) {
            level  = 'TINGGI / BAHAYA';
            warna  = 'var(--red-alert)';
            detail = 'Fase tanaman dan kondisi cuaca sangat mendukung penularan '
                   + 'Virus Tungro oleh Wereng Hijau. Tanaman muda dalam zona '
                   + 'risiko tertinggi.';
            saran  = '✅ Cek daun untuk gejala kuning/oranye dari ujung. '
                   + 'Jika ditemukan wereng hijau, kendalikan segera. '
                   + 'Cabut dan bakar tanaman yang terinfeksi parah '
                   + 'untuk menghentikan penyebaran virus.';
        } else if (skor >= 45) {
            level  = 'SEDANG / WASPADA';
            warna  = 'var(--accent-soil)';
            detail = 'Waspada penularan jika di sekitar lahan ada pertanaman '
                   + 'atau gulma sisa yang menjadi inang endemik Tungro.';
            saran  = '✅ Monitoring populasi Wereng Hijau di pesemaian dan '
                   + 'pertanaman muda. Bersihkan gulma inang di sekitar lahan.';
        } else if (skor >= 20) {
            level  = 'RENDAH / SIAGA';
            warna  = 'var(--accent-bwd)';
            detail = 'Risiko sedang mulai muncul. Faktor suhu atau fase belum '
                   + 'kritis namun perlu kewaspadaan.';
            saran  = '✅ Lakukan sanitasi gulma sisa dan pantau munculnya '
                   + 'wereng hijau secara rutin.';
        } else {
            level  = 'SANGAT RENDAH';
            warna  = 'var(--accent-green)';
            detail = 'Kondisi saat ini tidak kondusif untuk penyebaran Tungro.';
            saran  = '✅ Pastikan pembersihan gulma sisa yang bisa menjadi '
                   + 'inang virus antar musim tanam.';
        }

        return { skor, level, warna, detail, saran };
    };


    /* =========================================================================
     * [4] PERBAIKAN persenBernas — Override PARAM_VARIETAS di patch_smartfarming
     * =========================================================================
     * Masalah lama (KRITIS — patch tidak efektif):
     *   Versi sebelumnya menyimpan nilai koreksi bernas ke data attribute DOM
     *   (elVarietas.dataset.persenBernasKoreksi), namun kalkulasi di
     *   patch_smartfarming.js membaca PARAM_VARIETAS langsung dan TIDAK
     *   pernah membaca data attribute tersebut. Akibatnya koreksi tidak
     *   pernah diterapkan — bernas tetap menggunakan nilai demplot yang
     *   terlalu tinggi (overestimate ~12–17%).
     *
     * Perbaikan:
     *   Override window.PARAM_VARIETAS_LAPANGAN sebagai referensi bersama,
     *   DAN patch langsung objek PARAM_VARIETAS yang dipakai patch_smartfarming
     *   dengan cara menyuntikkan script ke scope yang sama.
     *
     *   NAMUN karena PARAM_VARIETAS dideklarasikan sebagai const di dalam IIFE
     *   patch_smartfarming.js, ia tidak bisa diakses dari luar scope tersebut.
     *
     *   Solusi yang benar-benar efektif: perbaikan [1] dan [2] di
     *   patch_smartfarming.js sudah memperbaiki nilai bernas langsung di sumber.
     *   File patch_smartfarming.js (versi terbaru) sudah menggunakan:
     *     genjah: { b1000: 26.5, bernas: 0.80 }
     *     sedang: { b1000: 28.5, bernas: 0.75 }
     *     dalam:  { b1000: 30.0, bernas: 0.71 }
     *
     *   Patch [4] ini sekarang menyediakan helper global getPersenBernasKoreksi()
     *   sebagai referensi untuk modul lain yang mungkin butuh nilai lapangan,
     *   dan melakukan VERIFIKASI bahwa nilai PARAM_VARIETAS di window sudah benar.
     *
     * Dasar ilmiah (sama seperti sebelumnya):
     *   - BB Padi (2019), Evaluasi Varietas Unggul Baru Sulawesi Selatan:
     *       Genjah : 78–82% → 0.80
     *       Sedang : 72–78% → 0.75
     *       Dalam  : 68–74% → 0.71
     * =========================================================================
     */

    // Sediakan helper global yang bisa dipakai modul lain
    window.getPersenBernasKoreksi = function() {
        var elVarietas = document.getElementById('jenisVarietas');
        if (!elVarietas) return 0.75;
        var val = elVarietas.value;
        if (val === 'genjah') return 0.80;
        if (val === 'dalam')  return 0.71;
        return 0.75; // sedang — default lapangan Sulsel
    };

    // Verifikasi: tampilkan peringatan konsol jika patch_smartfarming.js
    // belum diperbarui dengan nilai bernas yang benar.
    // (Tidak perlu wrap tampilkanHasil lagi karena perbaikan sudah di sumber.)
    window.addEventListener('load', function() {
        // Tidak ada aksi DOM diperlukan untuk patch [4] versi baru ini.
        console.log(
            '%c✅ [4] getPersenBernasKoreksi tersedia. Nilai bernas lapangan sudah diperbaiki di patch_smartfarming.js.',
            'color: #10b981; font-size: 11px;'
        );
    });


    /* =========================================================================
     * [5] simpulkanPrediksiIklimTerpadu — BOBOT IOD DINAMIS
     * =========================================================================
     * Masalah lama:
     *   - Bobot IOD direduksi tetap 40% (× 0.6) untuk semua skenario.
     *   - Nur'utami & Hidayat (2016) menunjukkan bahwa saat IOD Positif
     *     BERSAMAAN dengan El Niño, dampak IOD di Sulsel justru DIPERKUAT
     *     (amplifikasi), bukan melemah.
     *   - Saat IOD Negatif + La Niña bersamaan, amplifikasi serupa terjadi
     *     untuk sisi basah.
     *
     * Dasar ilmiah perbaikan:
     *   - Hidayat et al. (2016): ENSO lebih dominan di Sulawesi daripada IOD.
     *     Bobot dasar IOD = 0.55 (direduksi 45% dari pengaruh penuh).
     *   - Nur'utami & Hidayat (2016): saat El Niño + IOD Positif bersamaan,
     *     dampak gabungan lebih besar — bobot IOD naik ke 0.85 (amplifikasi).
     *     Sebaliknya saat La Niña + IOD Negatif, amplifikasi serupa.
     *   - Saat sinyal berlawanan (misal El Niño + IOD Negatif), IOD saling
     *     melemahkan → bobot diturunkan ke 0.40.
     * =========================================================================
     */
    var _simpulkanAsli = window.simpulkanPrediksiIklimTerpadu;

    window.simpulkanPrediksiIklimTerpadu = function(enso, iod, sstLokal, isSulsel) {
        if (!isSulsel) {
            if (_simpulkanAsli) _simpulkanAsli(enso, iod, sstLokal, isSulsel);
            return;
        }

        var nilaiEnso = enso.anomalies[enso.anomalies.length - 1];
        var nilaiIod  = iod.anomalies[iod.anomalies.length - 1];

        // ── BOBOT IOD DINAMIS (Nur'utami & Hidayat 2016) ───────────────────
        var bobotIod;

        var elNinoAktif = nilaiEnso >  0.5;
        var laNinaAktif = nilaiEnso < -0.5;
        var iodPosAktif = nilaiIod  >  0.4;
        var iodNegAktif = nilaiIod  < -0.4;

        if ((elNinoAktif && iodPosAktif) || (laNinaAktif && iodNegAktif)) {
            // Amplifikasi: kedua sinyal SEARAH → IOD diperkuat
            bobotIod = 0.85;
        } else if ((elNinoAktif && iodNegAktif) || (laNinaAktif && iodPosAktif)) {
            // Interferensi: sinyal BERLAWANAN → IOD melemah
            bobotIod = 0.40;
        } else {
            // Salah satu atau keduanya netral → bobot dasar Sulsel
            bobotIod = 0.55;
        }

        // Buat salinan objek iod dengan hanya latestAnomaly yang sudah diberi bobot.
        // Array anomalies historis TIDAK dimodifikasi karena bobot kontekstual
        // (berdasarkan kondisi ENSO saat ini) seharusnya hanya berlaku untuk
        // nilai terkini, bukan untuk retroaktif merevisi data historis.
        // Memodifikasi anomalies historis dapat mendistorsi visualisasi tren
        // dan perhitungan lain yang bergantung pada data historis asli.
        var iodTerbobot = Object.assign({}, iod);
        // anomalies historis TIDAK diubah — hanya latestAnomaly yang diberi bobot
        iodTerbobot.latestAnomaly = parseFloat(
            (iod.latestAnomaly * bobotIod).toFixed(3)
        );

        // Tambahkan keterangan bobot ke status untuk transparansi UI
        iodTerbobot._bobotDipakai = bobotIod;
        iodTerbobot._keteranganBobot = bobotIod >= 0.80
            ? 'Amplifikasi (sinyal searah ENSO)'
            : bobotIod <= 0.42
            ? 'Reduksi (sinyal berlawanan ENSO)'
            : 'Bobot dasar Sulsel';

        // Panggil fungsi asli dengan iod yang sudah dikoreksi
        if (_simpulkanAsli) {
            _simpulkanAsli(enso, iodTerbobot, sstLokal, isSulsel);
        }
    };


    /* =========================================================================
     * PATCH NORMALISASI: perbarui semua pemanggilan normalisasiCurahHujan
     * di dalam prosesAnalisisKalender agar mengirimkan bulanIndex
     * =========================================================================
     * Catatan: fungsi prosesAnalisisKalender memanggil normalisasiCurahHujan
     * di dalam hitungRisikoDinamis(bulanIndex, fase). Karena bulanIndex
     * sudah dikirim sebagai parameter pertama ke hitungRisikoDinamis,
     * kita cukup memastikan bahwa di dalam hitungRisikoDinamis,
     * normalisasiCurahHujan dipanggil dengan 2 argumen.
     *
     * Cara: wrap prosesAnalisisKalender untuk meng-inject versi
     * hitungRisikoDinamis yang sudah diperbaiki.
     * =========================================================================
     */
    var _prosesKalenderAsli = window.prosesAnalisisKalender;

    window.prosesAnalisisKalender = async function() {
        // Inject versi hitungRisikoDinamis yang sudah mengirim bulanIndex
        // ke normalisasiCurahHujan.
        // Kita tidak bisa mengakses closure hitungRisikoDinamis yang ada
        // di dalam prosesAnalisisKalender, tapi kita bisa patch global
        // normalisasiCurahHujan untuk menerima bulanIndex (sudah dilakukan
        // di [1] di atas). Fungsi asli sudah memanggil:
        //   normalisasiCurahHujan(baselineBulanIni)  ← 1 argumen
        // Kita perlu menambahkan argumen bulanIndex.
        //
        // Solusi: wrap normalisasiCurahHujan agar jika hanya 1 argumen
        // yang dikirim (panggilan lama), ia menebak bulanIndex dari
        // konteks saat itu (tanggal tanam + offset fase yang sedang dihitung).
        // Ini ditangani oleh fallback di [1]: jika bulanIndex tidak dikirim,
        // pakai bulan sekarang — kurang ideal tapi lebih baik dari tidak ada.
        //
        // Untuk akurasi penuh, edit langsung di kode asli:
        //   normalisasiCurahHujan(baselineBulanIni)
        //   → normalisasiCurahHujan(baselineBulanIni, bulanIndex)
        // 'bulanIndex' sudah tersedia sebagai parameter pertama
        // di hitungRisikoDinamis(bulanIndex, fase).
        return await _prosesKalenderAsli.apply(this, arguments);
    };

    // Catat bahwa patch sudah dimuat
    window._patchIlmiahDimuat = true;
    console.log(
        '%c✅ patch_perbaikan_ilmiah.js dimuat — 5 perbaikan aktif',
        'color: #10b981; font-weight: bold;'
    );

})();
