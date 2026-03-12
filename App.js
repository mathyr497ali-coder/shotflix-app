import React, { useEffect, useState, useCallback, useRef } from "react";

export default function App() {
  // --- الحالات الأساسية ---
  const [movies, setMovies] = useState([]);
  const [contentType, setContentType] = useState("movie");
  const [page, setPage] = useState(1);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [cast, setCast] = useState([]);
  const [similarMovies, setSimilarMovies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [trailerKey, setTrailerKey] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [accentColor, setAccentColor] = useState("#e50914");
  const [toast, setToast] = useState("");
  const [sortBy, setSortBy] = useState("popularity.desc");
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // مرجع لمنع تكرار الطلبات المتداخلة والحفاظ على أحدث صفحة
  const isFetching = useRef(false);

  const API_KEY = "02c570fbc33df3474a3e4fe27d34195f";

  const [watchLater, setWatchLater] = useState(() =>
    JSON.parse(localStorage.getItem("shotflix_later") || "[]")
  );
  const [favorites, setFavorites] = useState(() =>
    JSON.parse(localStorage.getItem("shotflix_v3_favs") || "[]")
  );
  const [showOnlyFavs, setShowOnlyFavs] = useState(false);
  const [showOnlyLater, setShowOnlyLater] = useState(false);

  const genres = [
    { id: "28", name: "أكشن" },
    { id: "27", name: "رعب" },
    { id: "35", name: "كوميدي" },
    { id: "878", name: "خيال علمي" },
    { id: "16", name: "أنيميشن" },
    { id: "18", name: "دراما" },
  ];

  useEffect(() => {
    localStorage.setItem("shotflix_v3_favs", JSON.stringify(favorites));
    localStorage.setItem("shotflix_later", JSON.stringify(watchLater));
  }, [favorites, watchLater]);

  const showNotification = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  // --- دالة جلب البيانات المحسنة جداً ---
  const fetchData = useCallback(
    async (pageNum) => {
      // منع التحميل إذا كنا في وضع المفضلات أو جاري التحميل بالفعل
      if (showOnlyFavs || showOnlyLater || isFetching.current) return;

      isFetching.current = true;
      setLoading(true);

      let url = `https://api.themoviedb.org/3/discover/${contentType}?api_key=${API_KEY}&language=ar-SA&page=${pageNum}&sort_by=${sortBy}&include_adult=false`;

      if (query) {
        url = `https://api.themoviedb.org/3/search/${contentType}?api_key=${API_KEY}&query=${encodeURIComponent(
          query
        )}&language=ar-SA&page=${pageNum}&include_adult=false`;
      } else if (selectedGenre) {
        url += `&with_genres=${selectedGenre}`;
      }

      try {
        const res = await fetch(url);
        const data = await res.json();

        if (data.results && data.results.length > 0) {
          setMovies((prev) => {
            // فلترة لمنع تكرار الأفلام بناءً على الـ ID
            const existingIds = new Set(prev.map((m) => m.id));
            const newMovies = data.results.filter(
              (m) => !existingIds.has(m.id)
            );
            return pageNum === 1 ? data.results : [...prev, ...newMovies];
          });
        }
      } catch (e) {
        showNotification("خطأ في الاتصال بالسيرفر");
      } finally {
        setLoading(false);
        isFetching.current = false;
      }
    },
    [contentType, sortBy, query, selectedGenre, showOnlyFavs, showOnlyLater]
  );

  // تصفير الصفحة عند تغيير النوع أو البحث أو الفلتر
  useEffect(() => {
    setPage(1);
    setMovies([]); // تفريغ القائمة للبدء من جديد
    fetchData(1);
  }, [query, contentType, sortBy, selectedGenre]);

  // نظام التمرير اللانهائي المصلح
  useEffect(() => {
    const handleScroll = () => {
      // إذا وصلنا لآخر 300 بكسل من الصفحة
      const scrollHeight = document.documentElement.scrollHeight;
      const currentScroll = window.innerHeight + window.scrollY;

      if (currentScroll >= scrollHeight - 300 && !loading) {
        setPage((prev) => {
          const nextPage = prev + 1;
          fetchData(nextPage);
          return nextPage;
        });
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [loading, fetchData]);

  const openDetails = async (movie) => {
    setSelectedMovie(movie);
    setCast([]);
    setSimilarMovies([]);
    window.scrollTo({ top: 0, behavior: "smooth" });
    try {
      const [vRes, cRes, sRes] = await Promise.all([
        fetch(
          `https://api.themoviedb.org/3/${contentType}/${movie.id}/videos?api_key=${API_KEY}`
        ),
        fetch(
          `https://api.themoviedb.org/3/${contentType}/${movie.id}/credits?api_key=${API_KEY}&language=ar-SA`
        ),
        fetch(
          `https://api.themoviedb.org/3/${contentType}/${movie.id}/similar?api_key=${API_KEY}&language=ar-SA`
        ),
      ]);
      const vData = await vRes.json();
      const cData = await cRes.json();
      const sData = await sRes.json();
      setTrailerKey(
        vData.results?.find((v) => v.type === "Trailer" || v.type === "Teaser")
          ?.key
      );
      setCast(cData.cast?.slice(0, 10) || []);
      setSimilarMovies(sData.results?.slice(0, 10) || []);
    } catch (e) {
      console.error(e);
    }
  };

  const toggleFavorite = (m) => {
    if (favorites.find((f) => f.id === m.id)) {
      setFavorites(favorites.filter((f) => f.id !== m.id));
      showNotification("تم الإزالة من المفضلات");
    } else {
      setFavorites([...favorites, m]);
      showNotification("تمت الإضافة للمفضلات ❤️");
    }
  };

  const theme = {
    bg: isDarkMode ? "#050505" : "#f8f9fa",
    text: isDarkMode ? "#fff" : "#1a1a1a",
    card: isDarkMode ? "#121212" : "#fff",
    header: isDarkMode ? "rgba(5,5,5,0.85)" : "rgba(255,255,255,0.85)",
    border: isDarkMode ? "rgba(255,255,255,0.1)" : "#ddd",
    glass: isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)",
  };

  const displayedMovies = showOnlyFavs
    ? favorites
    : showOnlyLater
    ? watchLater
    : movies;

  return (
    <div
      style={{
        background: theme.bg,
        color: theme.text,
        minHeight: "100vh",
        direction: "rtl",
        fontFamily: "sans-serif",
        transition: "0.3s",
      }}
    >
      {toast && (
        <div
          style={{
            position: "fixed",
            top: "20px",
            left: "50%",
            transform: "translateX(-50%)",
            background: accentColor,
            color: "#fff",
            padding: "10px 25px",
            borderRadius: "30px",
            zIndex: 6000,
            fontWeight: "bold",
            boxShadow: "0 5px 15px rgba(0,0,0,0.3)",
          }}
        >
          {toast}
        </div>
      )}

      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 1000,
          background: theme.header,
          backdropFilter: "blur(20px)",
          padding: "15px",
          borderBottom: `1px solid ${theme.border}`,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "15px",
          }}
        >
          <div
            onClick={() => setIsSidebarOpen(true)}
            style={{ fontSize: "2rem", color: accentColor, cursor: "pointer" }}
          >
            ☰
          </div>
          <h1
            style={{
              color: accentColor,
              margin: 0,
              fontSize: "1.6rem",
              fontWeight: "900",
              letterSpacing: "1px",
            }}
          >
            SHOTFLIX ∞
          </h1>
          <button
            onClick={() =>
              movies.length &&
              openDetails(movies[Math.floor(Math.random() * movies.length)])
            }
            style={{
              background: "none",
              border: "none",
              fontSize: "1.5rem",
              cursor: "pointer",
            }}
          >
            🎲
          </button>
        </div>

        <input
          type="text"
          placeholder="ابحث عن فيلم أو مسلسل..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelectedGenre("");
            setShowOnlyFavs(false);
            setShowOnlyLater(false);
          }}
          style={{
            width: "100%",
            padding: "12px",
            borderRadius: "12px",
            border: "none",
            background: isDarkMode ? "#1a1a1a" : "#eee",
            color: theme.text,
            outline: "none",
          }}
        />

        <div
          style={{
            display: "flex",
            gap: "10px",
            marginTop: "12px",
            overflowX: "auto",
            paddingBottom: "5px",
          }}
        >
          <span
            onClick={() => {
              setSelectedGenre("");
              setQuery("");
              setShowOnlyFavs(false);
              setShowOnlyLater(false);
            }}
            style={{
              padding: "6px 16px",
              background:
                !selectedGenre && !showOnlyFavs && !showOnlyLater
                  ? accentColor
                  : "rgba(255,255,255,0.1)",
              borderRadius: "20px",
              fontSize: "0.8rem",
              cursor: "pointer",
            }}
          >
            الكل
          </span>
          {genres.map((g) => (
            <span
              key={g.id}
              onClick={() => {
                setSelectedGenre(g.id);
                setShowOnlyFavs(false);
                setShowOnlyLater(false);
              }}
              style={{
                padding: "6px 16px",
                background:
                  selectedGenre === g.id
                    ? accentColor
                    : "rgba(255,255,255,0.1)",
                borderRadius: "20px",
                fontSize: "0.8rem",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {g.name}
            </span>
          ))}
          <span
            onClick={() =>
              setContentType(contentType === "movie" ? "tv" : "movie")
            }
            style={{
              padding: "6px 16px",
              background: "rgba(255,255,255,0.1)",
              borderRadius: "20px",
              fontSize: "0.8rem",
              cursor: "pointer",
              whiteSpace: "nowrap",
              border: `1px solid ${accentColor}`,
            }}
          >
            {contentType === "movie" ? "📺 مسلسلات" : "🎬 أفلام"}
          </span>
        </div>
      </header>

      {/* القائمة الجانبية */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.8)",
            zIndex: 2000,
          }}
        />
      )}
      <div
        style={{
          position: "fixed",
          right: isSidebarOpen ? 0 : "-300px",
          top: 0,
          width: "280px",
          height: "100vh",
          background: theme.card,
          zIndex: 2001,
          transition: "0.4s",
          padding: "20px",
          borderLeft: `2px solid ${accentColor}`,
        }}
      >
        <h2
          style={{
            color: accentColor,
            borderBottom: "1px solid #333",
            paddingBottom: "10px",
          }}
        >
          القائمة
        </h2>
        <div
          onClick={() => {
            setShowOnlyFavs(false);
            setShowOnlyLater(false);
            setIsSidebarOpen(false);
          }}
          style={{ padding: "15px 0", cursor: "pointer" }}
        >
          🏠 الرئيسية
        </div>
        <div
          onClick={() => {
            setIsProfileOpen(true);
            setIsSidebarOpen(false);
          }}
          style={{ padding: "15px 0", cursor: "pointer" }}
        >
          👤 البروفايل الخاص بك
        </div>
        <div
          onClick={() => {
            setShowOnlyFavs(true);
            setShowOnlyLater(false);
            setIsSidebarOpen(false);
          }}
          style={{
            padding: "15px 0",
            cursor: "pointer",
            color: showOnlyFavs ? accentColor : theme.text,
          }}
        >
          ❤️ المفضلات ({favorites.length})
        </div>
        <div
          onClick={() => {
            setShowOnlyLater(true);
            setShowOnlyFavs(false);
            setIsSidebarOpen(false);
          }}
          style={{
            padding: "15px 0",
            cursor: "pointer",
            color: showOnlyLater ? accentColor : theme.text,
          }}
        >
          🕒 قائمة المشاهدة ({watchLater.length})
        </div>
        <div
          onClick={() => {
            setIsDarkMode(!isDarkMode);
            setIsSidebarOpen(false);
          }}
          style={{
            padding: "15px 0",
            cursor: "pointer",
            borderTop: "1px solid #333",
            marginTop: "10px",
          }}
        >
          {isDarkMode ? "🌞 الوضع النهاري" : "🌙 الوضع الليلي"}
        </div>
      </div>

      <main style={{ padding: "15px" }}>
        <h3 style={{ marginBottom: "15px", color: accentColor }}>
          {showOnlyFavs
            ? "❤️ مفضلاتك"
            : showOnlyLater
            ? "🕒 قائمة المشاهدة"
            : "🔥 استكشف آلاف العروض"}
        </h3>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "10px",
          }}
        >
          {displayedMovies.map((m, idx) => (
            <div
              key={`${m.id}-${idx}`}
              onClick={() => openDetails(m)}
              style={{
                borderRadius: "12px",
                overflow: "hidden",
                animation: "fadeIn 0.5s ease",
                background: "#111",
              }}
            >
              <img
                src={
                  m.poster_path
                    ? `https://image.tmdb.org/t/p/w300${m.poster_path}`
                    : "https://via.placeholder.com/300x450"
                }
                style={{
                  width: "100%",
                  aspectRatio: "2/3",
                  objectFit: "cover",
                }}
                alt=""
                loading="lazy"
              />
            </div>
          ))}
        </div>

        {loading && (
          <div
            style={{
              textAlign: "center",
              padding: "30px",
              color: accentColor,
              fontSize: "1.2rem",
            }}
          >
            <div className="loader" style={{ marginBottom: "10px" }}>
              ⌛
            </div>
            جاري جلب المزيد...
          </div>
        )}

        {displayedMovies.length === 0 && !loading && (
          <div
            style={{ textAlign: "center", marginTop: "100px", opacity: 0.5 }}
          >
            <div style={{ fontSize: "3rem" }}>Empty</div>
            <p>لا توجد نتائج.</p>
            <button
              onClick={() => {
                setShowOnlyFavs(false);
                setShowOnlyLater(false);
                setQuery("");
              }}
              style={{
                background: accentColor,
                color: "#fff",
                border: "none",
                padding: "10px 20px",
                borderRadius: "10px",
                marginTop: "10px",
              }}
            >
              العودة للرئيسية
            </button>
          </div>
        )}
      </main>

      {/* صفحة التفاصيل */}
      {selectedMovie && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: theme.bg,
            zIndex: 3000,
            overflowY: "auto",
          }}
        >
          <div
            style={{
              position: "fixed",
              inset: 0,
              backgroundImage: `url(https://image.tmdb.org/t/p/w500${selectedMovie.poster_path})`,
              backgroundSize: "cover",
              filter: "blur(100px) brightness(0.2)",
              zIndex: -1,
            }}
          />
          <div style={{ position: "relative", height: "400px" }}>
            <img
              src={`https://image.tmdb.org/t/p/original${
                selectedMovie.backdrop_path || selectedMovie.poster_path
              }`}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
              alt=""
            />
            <button
              onClick={() => setSelectedMovie(null)}
              style={{
                position: "absolute",
                top: "20px",
                left: "20px",
                background: "rgba(0,0,0,0.6)",
                border: "none",
                borderRadius: "50%",
                width: "45px",
                height: "45px",
                color: "#fff",
                fontSize: "1.2rem",
              }}
            >
              ✕
            </button>
          </div>

          <div
            style={{
              padding: "25px",
              marginTop: "-50px",
              background: theme.bg,
              borderRadius: "30px 30px 0 0",
              position: "relative",
            }}
          >
            <h2 style={{ fontSize: "1.8rem", marginBottom: "5px" }}>
              {selectedMovie.title || selectedMovie.name}
            </h2>
            <p
              style={{
                color: accentColor,
                fontWeight: "bold",
                marginBottom: "20px",
              }}
            >
              ⭐ {selectedMovie.vote_average} |{" "}
              {selectedMovie.release_date || selectedMovie.first_air_date}
            </p>

            <div style={{ display: "flex", gap: "10px", marginBottom: "25px" }}>
              <button
                onClick={() =>
                  trailerKey
                    ? window.open(
                        `https://www.youtube.com/watch?v=${trailerKey}`
                      )
                    : showNotification("لا يوجد إعلان")
                }
                style={{
                  flex: 2,
                  padding: "15px",
                  background: accentColor,
                  color: "#fff",
                  border: "none",
                  borderRadius: "15px",
                  fontWeight: "bold",
                }}
              >
                ▶ مشاهدة الإعلان
              </button>
              <button
                onClick={() => toggleFavorite(selectedMovie)}
                style={{
                  flex: 1,
                  padding: "15px",
                  background: "#222",
                  color: "#fff",
                  border: "none",
                  borderRadius: "15px",
                }}
              >
                {favorites.find((f) => f.id === selectedMovie.id) ? "❤️" : "🤍"}
              </button>
            </div>

            <p style={{ lineHeight: "1.8", opacity: 0.9, fontSize: "0.95rem" }}>
              {selectedMovie.overview || "لا يوجد وصف متاح لهذا العمل."}
            </p>

            <h4 style={{ color: accentColor, marginTop: "30px" }}>
              🎭 طاقم العمل
            </h4>
            <div
              style={{
                display: "flex",
                gap: "15px",
                overflowX: "auto",
                paddingBottom: "10px",
              }}
            >
              {cast.map((c) => (
                <div
                  key={c.id}
                  style={{ textAlign: "center", minWidth: "80px" }}
                >
                  <img
                    src={
                      c.profile_path
                        
