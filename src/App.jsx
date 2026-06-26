import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

function App() {
  // =========================
  // AUTH STATE
  // =========================
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false); 
  const [isSignUp, setIsSignUp] = useState(false); 
  const [authError, setAuthError] = useState("");

  // =========================
  // UPDATE PASSWORD STATE
  // =========================
  const [openPasswordModal, setOpenPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [passwordTargetShow, setPasswordTargetShow] = useState(false);
  const [passwordStatusMsg, setPasswordStatusMsg] = useState("");

  // =========================
  // UI & NAV STATE
  // =========================
  const [page, setPage] = useState("leituras");
  const [books, setBooks] = useState([]);
  const [booksLoading, setBooksLoading] = useState(false);
  const [openModal, setOpenModal] = useState(false);
  const [editingId, setEditingId] = useState(null); 
  const [selectedBook, setSelectedBook] = useState(null); 

  // =========================
  // RASTREAMENTO & LOGS STATE
  // =========================
  const [readingLogs, setReadingLogs] = useState([]);
  const [inputPageUpdate, setInputPageUpdate] = useState("");
  const [logStatusMsg, setLogStatusMsg] = useState("");

  // =========================
  // FORM STATE
  // =========================
  const [form, setForm] = useState({
    title: "",
    author: "",
    publisher: "",
    rating: 0,
    favorite: false,
    pages: "",
    startDate: "",
    endDate: "",
    genre: "",
    cover: "",
    summary: "",
    status: "quero",
    current_page: 0
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      fetchBooks();
      fetchLogs();
    } else {
      setBooks([]);
      setReadingLogs([]);
    }
  }, [user]);

  // =========================
  // METODOS DE AUTENTICAÇÃO
  // =========================
  async function handleAuth(e) {
    e.preventDefault();
    setAuthError("");
    if (!authEmail || !authPassword) return;

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({
        email: authEmail,
        password: authPassword,
      });
      if (error) setAuthError(error.message);
      else alert("Conta criada com sucesso! Boas-vindas ao Arcana.");
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email: authEmail,
        password: authPassword,
      });
      if (error) setAuthError(error.message);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setSelectedBook(null);
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    setPasswordStatusMsg("");
    if (!newPassword || newPassword.length < 6) {
      setPasswordStatusMsg("⚠️ A senha precisa ter pelo menos 6 caracteres.");
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setPasswordStatusMsg(`⚠️ Erro: ${error.message}`);
    } else {
      setPasswordStatusMsg("🔮 Palavra-passe alterada com sucesso!");
      setTimeout(() => {
        setOpenPasswordModal(false);
        setNewPassword("");
        setPasswordStatusMsg("");
      }, 2000);
    }
  }

  // =========================
  // DATABASE CRUD & LOGS
  // =========================
  async function fetchBooks() {
    setBooksLoading(true);
    const { data, error } = await supabase
      .from("books")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      const formatted = data.map(b => ({
        ...b,
        startDate: b.start_date,
        endDate: b.end_date,
        current_page: b.current_page || 0
      }));
      setBooks(formatted);
    }
    setBooksLoading(false);
  }

  async function fetchLogs() {
    const { data, error } = await supabase
      .from("reading_logs")
      .select("*")
      .order("logged_at", { ascending: false });
    if (!error && data) setReadingLogs(data);
  }

  async function saveBook() {
    if (!form.title || !form.author || !user) return;

    const formattedGenre = form.genre ? form.genre.trim() : "Outros";
    const totalPagesNum = parseInt(form.pages) || 0;
    
    const bookData = {
      user_id: user.id,
      title: form.title,
      author: form.author,
      publisher: form.publisher,
      rating: form.rating,
      favorite: form.favorite,
      pages: totalPagesNum > 0 ? totalPagesNum.toString() : "",
      start_date: form.startDate,
      end_date: form.endDate,
      genre: formattedGenre,
      cover: form.cover,
      summary: form.summary,
      status: form.status,
      current_page: form.current_page || 0
    };

    if (editingId) {
      const { error } = await supabase
        .from("books")
        .update(bookData)
        .eq("id", editingId);

      if (!error) {
        const updatedLocal = { ...form, genre: formattedGenre, id: editingId, current_page: form.current_page || 0 };
        setBooks(books.map((b) => (b.id === editingId ? updatedLocal : b)));
        if (selectedBook && selectedBook.id === editingId) {
          setSelectedBook(updatedLocal);
        }
      }
    } else {
      const { data, error } = await supabase
        .from("books")
        .insert([bookData])
        .select();

      if (!error && data) {
        const created = { ...data[0], startDate: data[0].start_date, endDate: data[0].end_date, current_page: data[0].current_page || 0 };
        setBooks([created, ...books]);
      }
    }

    resetForm();
    setOpenModal(false);
  }

  async function handleUpdateProgress(e) {
    e.preventDefault();
    setLogStatusMsg("");
    if (!selectedBook) return;

    const targetPage = parseInt(inputPageUpdate);
    const totalPages = parseInt(selectedBook.pages) || 0;

    if (isNaN(targetPage) || targetPage < 0) {
      setLogStatusMsg("⚠️ Insira uma página válida.");
      return;
    }
    if (totalPages > 0 && targetPage > totalPages) {
      setLogStatusMsg(`⚠️ A página não pode ser maior que o total (${totalPages}).`);
      return;
    }

    const pagesJustRead = targetPage - selectedBook.current_page;

    // Atualiza a página atual do livro no banco
    const { error: bookError } = await supabase
      .from("books")
      .update({ current_page: targetPage })
      .eq("id", selectedBook.id);

    if (!bookError) {
      // Se ele leu páginas a mais, registra um Log Diário
      if (pagesJustRead > 0) {
        await supabase.from("reading_logs").insert([
          { user_id: user.id, book_id: selectedBook.id, pages_read: pagesJustRead }
        ]);
        fetchLogs();
      }

      // Atualiza os estados locais
      const updatedBook = { ...selectedBook, current_page: targetPage };
      setBooks(books.map(b => b.id === selectedBook.id ? updatedBook : b));
      setSelectedBook(updatedBook);
      setInputPageUpdate("");
      setLogStatusMsg("🔮 Progresso salvo e log registrado!");
    } else {
      setLogStatusMsg("⚠️ Falha ao salvar progresso.");
    }
  }

  async function deleteBook(id, e) {
    if (e) e.stopPropagation();
    const { error } = await supabase.from("books").delete().eq("id", id);
    if (!error) {
      setBooks(books.filter((b) => b.id !== id));
      if (selectedBook && selectedBook.id === id) setSelectedBook(null);
    }
  }

  async function toggleFavorite(id, e) {
    if (e) e.stopPropagation();
    const currentBook = books.find(b => b.id === id);
    if (!currentBook) return;

    const nextFavoriteState = !currentBook.favorite;
    const { error } = await supabase.from("books").update({ favorite: nextFavoriteState }).eq("id", id);

    if (!error) {
      setBooks(books.map((b) => b.id === id ? { ...b, favorite: nextFavoriteState } : b));
      if (selectedBook && selectedBook.id === id) {
        setSelectedBook({ ...selectedBook, favorite: nextFavoriteState });
      }
    }
  }

  async function updateStatus(id, status, e) {
    if (e) e.stopPropagation();
    const { error } = await supabase.from("books").update({ status }).eq("id", id);
    if (!error) {
      setBooks(books.map((b) => b.id === id ? { ...b, status } : b));
      if (selectedBook && selectedBook.id === id) {
        setSelectedBook({ ...selectedBook, status });
      }
    }
  }

  function resetForm() {
    setForm({
      title: "",
      author: "",
      publisher: "",
      rating: 0,
      favorite: false,
      pages: "",
      startDate: "",
      endDate: "",
      genre: "",
      cover: "",
      summary: "",
      status: "quero",
      current_page: 0
    });
    setEditingId(null);
  }

  function handleCardClick(book) {
    setSelectedBook(book); 
    setLogStatusMsg("");
    setInputPageUpdate("");
  }

  function handleEditFromPreview() {
    setForm(selectedBook);
    setEditingId(selectedBook.id);
    setSelectedBook(null); 
    setOpenModal(true); 
  }

  function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setForm({ ...form, cover: reader.result });
    reader.readAsDataURL(file);
  }

  // =========================
  // CALCULOS DOS LOGS (TEMPO)
  // =========================
  function getStatsByPeriod() {
    const now = new Date();
    let dayTotal = 0;
    let weekTotal = 0;
    let monthTotal = 0;

    readingLogs.forEach(log => {
      const logDate = new Date(log.logged_at);
      const diffTime = Math.abs(now - logDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // Hoje
      if (logDate.toDateString() === now.toDateString()) {
        dayTotal += log.pages_read;
      }
      // Últimos 7 dias
      if (diffDays <= 7) {
        weekTotal += log.pages_read;
      }
      // Últimos 30 dias
      if (diffDays <= 30) {
        monthTotal += log.pages_read;
      }
    });

    return { dayTotal, weekTotal, monthTotal };
  }

  const favorites = books.filter((b) => b.favorite);
  const byStatus = (s) => books.filter((b) => b.status === s);

  function getGenreData() {
    if (books.length === 0) return [];
    const counts = {};
    books.forEach((book) => {
      const g = book.genre || "Outros";
      counts[g] = (counts[g] || 0) + 1;
    });
    const colors = ["#8c62ff", "#ff62b0", "#62ffb0", "#ffd36e", "#ff9f43", "#4db5ff", "#b8a8c7"];
    const total = books.length;
    return Object.keys(counts).map((genre, index) => ({
      name: genre, count: counts[genre], percentage: Math.round((counts[genre] / total) * 100), color: colors[index % colors.length]
    })).sort((a, b) => b.count - a.count);
  }

  function generatePieGradient(genreData) {
    if (genreData.length === 0) return "#444";
    let currentAngle = 0;
    const gradientParts = genreData.map((genre) => {
      const start = currentAngle;
      currentAngle += genre.percentage;
      return `${genre.color} ${start}% ${currentAngle}%`;
    });
    return `conic-gradient(${gradientParts.join(", ")})`;
  }

  function calculatePercentage(current, total) {
    const tot = parseInt(total) || 0;
    if (tot <= 0) return 0;
    const pct = Math.round((current / tot) * 100);
    return pct > 100 ? 100 : pct;
  }

  // COMPONENTES AUXILIARES
  function Stars({ value, onChange }) {
    return (
      <div className="stars">
        {[1,2,3,4,5].map((n) => (
          <span key={n} onClick={() => onChange && onChange(n)} style={{ cursor: onChange ? "pointer" : "default", fontSize: "20px", color: n <= value ? "#ffd36e" : "#444" }}>★</span>
        ))}
      </div>
    );
  }

  function Card(book) {
    return (
      <div key={book.id} className="card book-card" onClick={() => handleCardClick(book)} style={{ cursor: 'pointer' }}>
        <div className="book-layout">
          <img src={book.cover || "https://via.placeholder.com/120x180"} className="book-cover" alt={book.title} />
          <div className="book-info">
            <h3>{book.title}</h3>
            <p className="author">{book.author}</p>
            <div className="stars-display">
              {[1, 2, 3, 4, 5].map((n) => (
                <span key={n} style={{ color: n <= book.rating ? "#ffd36e" : "#444" }}>★</span>
              ))}
            </div>
            <div className="book-actions">
              <button onClick={(e) => toggleFavorite(book.id, e)} className="btn-action">
                {book.favorite ? "❤️" : "🤍"}
              </button>
              <select value={book.status} onClick={(e) => e.stopPropagation()} onChange={(e) => updateStatus(book.id, e.target.value, e)}>
                <option value="quero">Quero</option>
                <option value="lendo">Lendo</option>
                <option value="lido">Lido</option>
              </select>
              <button onClick={(e) => deleteBook(book.id, e)} className="btn-delete">✕</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (authLoading) {
    return <div className="auth-loading"><h3>Consultando estrelas e grimórios... 🔮</h3></div>;
  }

  if (!user) {
    return (
      <div className="auth-container">
        <div className="auth-box">
          <h2>🌙 Arcana</h2>
          <p className="auth-subtitle">Sua biblioteca mística pessoal</p>
          <form onSubmit={handleAuth} className="auth-form">
            <div className="input-group">
              <label>E-mail mágico</label>
              <input type="email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} placeholder="bruxinha@arcana.com" required />
            </div>
            <div className="input-group">
              <label>Palavra-passe (Senha)</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input type={showPassword ? "text" : "password"} value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} placeholder="••••••••" style={{ width: '100%', paddingRight: '40px' }} required />
                <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '10px', background: 'none', border: 'none', color: 'var(--gold-soft)', cursor: 'pointer', fontSize: '16px' }}>{showPassword ? "👁️‍🗨️" : "👁️"}</button>
              </div>
            </div>
            {authError && <p className="auth-error-msg">⚠️ {authError}</p>}
            <button type="submit" className="btn-auth-submit">{isSignUp ? "Criar Grimório de Conta" : "Desbloquear Biblioteca 🔮"}</button>
          </form>
          <p className="auth-toggle-text">{isSignUp ? "Já possui chaves?" : "Novo neste círculo místico?"} <span onClick={() => { setIsSignUp(!isSignUp); setAuthError(""); setShowPassword(false); }}>{isSignUp ? "Fazer Login" : "Criar uma Conta"}</span></p>
        </div>
      </div>
    );
  }

  function renderPage() {
    if (page === "leituras") {
      const totalLivros = books.length;
      const lendoAgora = byStatus("lendo");
      const totalLidos = byStatus("lido").length;
      const totalQuero = byStatus("quero").length;

      const genreData = getGenreData();
      const pieGradient = generatePieGradient(genreData);
      
      // Estatísticas temporais reais computadas
      const { dayTotal, weekTotal, monthTotal } = getStatsByPeriod();

      // Pega o primeiro livro "Lendo" para a seção em destaque
      const currentBookFeatured = lendoAgora[0];
      const currentPct = currentBookFeatured ? calculatePercentage(currentBookFeatured.current_page, currentBookFeatured.pages) : 0;

      return (
        <>
          {booksLoading && <p style={{ color: "var(--gold)", textAlign: "center" }}>Buscando seus feitiços na nuvem...</p>}
          
          <section className="dashboard-counters">
            <div className="counter-card total"><span className="counter-icon">📚</span><div className="counter-info"><p>LIVROS NO TOTAL</p><h3>{totalLivros}</h3></div></div>
            <div className="counter-card lendo"><span className="counter-icon">📖</span><div className="counter-info"><p>LIVROS LENDO</p><h3>{lendoAgora.length}</h3></div></div>
            <div className="counter-card lidos"><span className="counter-icon">📘</span><div className="counter-info"><p>LIVROS LIDOS</p><h3>{totalLidos}</h3></div></div>
            <div className="counter-card nao-lidos"><span className="counter-icon">🌙</span><div className="counter-info"><p>LIVROS NÃO LIDOS</p><h3>{totalQuero}</h3></div></div>
          </section>

          {/* NOVO PAINEL DE REGISTRO DIÁRIO DE PÁGINAS */}
          <section className="dashboard-counters" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginTop: '0px', background: 'rgba(28,18,40,0.4)', padding: '15px', borderRadius: '18px', border: '1px solid rgba(214,180,125,0.08)' }}>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '11px', color: 'var(--gold)', letterSpacing: '1px', margin: 0 }}>LIDO HOJE</p>
              <h3 style={{ color: '#62ffb0', margin: '5px 0 0 0', fontFamily: 'Cinzel, serif' }}>{dayTotal} pág.</h3>
            </div>
            <div style={{ textAlign: 'center', borderLeft: '1px solid rgba(214,180,125,0.1)', borderRight: '1px solid rgba(214,180,125,0.1)' }}>
              <p style={{ fontSize: '11px', color: 'var(--gold)', letterSpacing: '1px', margin: 0 }}>ESTA SEMANA</p>
              <h3 style={{ color: 'var(--gold-soft)', margin: '5px 0 0 0', fontFamily: 'Cinzel, serif' }}>{weekTotal} pág.</h3>
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '11px', color: 'var(--gold)', letterSpacing: '1px', margin: 0 }}>ESTE MÊS</p>
              <h3 style={{ color: '#8c62ff', margin: '5px 0 0 0', fontFamily: 'Cinzel, serif' }}>{monthTotal} pág.</h3>
            </div>
          </section>

          <section className="dashboard-middle">
            <div className="genres-box">
              <h3>GÊNEROS LIDOS ✨</h3>
              <div className="genres-content">
                <div className="pie-chart-mock" style={{ background: pieGradient }}><div className="inner-circle">🔮</div></div>
                <ul className="genres-list">
                  {genreData.length > 0 ? (
                    genreData.map((genre, idx) => (
                      <div key={idx} style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <span className="dot" style={{ backgroundColor: genre.color }}></span>
                          <span>{genre.name}</span>
                        </div>
                        <span style={{ color: 'var(--muted)', fontSize: '13px' }}>{genre.percentage}%</span>
                      </div>
                    ))
                  ) : (
                    <p className="empty-text">Adicione livros para ver o gráfico.</p>
                  )}
                </ul>
              </div>
            </div>

            <div className="add-book-box">
              <div className="add-book-content">
                <span className="magic-book-icon">📖✨</span>
                <h3>Adicionar novo livro</h3>
                <button onClick={() => { resetForm(); setOpenModal(true); }} className="btn-add-magic">+ Adicionar livro</button>
              </div>
            </div>
          </section>

          <section className="dashboard-lower">
            <div className="current-reading-section">
              <h3>LENDO AGORA ✨</h3>
              {currentBookFeatured ? (
                <div className="current-book-display" onClick={() => handleCardClick(currentBookFeatured)} style={{ cursor: 'pointer' }}>
                  <img src={currentBookFeatured.cover || "https://via.placeholder.com/120x180"} alt="Capa" />
                  <div className="current-book-details">
                    <h4>{currentBookFeatured.title}</h4>
                    <p>{currentBookFeatured.author}</p>
                    <div className="progress-container">
                      <div className="progress-bar" style={{ width: `${currentPct}%` }}></div>
                    </div>
                    <span className="progress-text">{currentPct}% concluído ({currentBookFeatured.current_page}/{currentBookFeatured.pages || "?"} pág)</span>
                  </div>
                </div>
              ) : (
                <p className="empty-text">Nenhum livro sendo lido no momento.</p>
              )}
            </div>

            <div className="favorites-section">
              <h3>FAVORITOS 💖</h3>
              <div className="favorites-grid">
                {favorites.slice(0, 4).map((book) => (
                  <div key={book.id} className="fav-mini-card" onClick={() => handleCardClick(book)} style={{ cursor: 'pointer' }}>
                    <img src={book.cover || "https://via.placeholder.com/120x180"} alt={book.title} />
                    <h5>{book.title}</h5>
                    <div className="stars-mini">
                      {Array.from({ length: book.rating }).map((_, i) => <span key={i}>★</span>)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="books shelf-section">
            <div className="shelf-header"><h2>MEU ACERVO ✦</h2></div>
            <div className="netflix-row">
              {books.length > 0 ? books.map(Card) : <p className="empty-text">Seu acervo místico está vazio. Comece a criar feitiços!</p>}
            </div>
          </section>

          <footer className="magic-footer"><p>✦ Livros são feitiços disfarçados de palavras. ✦</p></footer>
        </>
      );
    }

    if (page === "wishlist") {
      return (
        <section className="books shelf-section">
          <h2>⭐ Wishlist</h2>
          <div className="netflix-row">{favorites.map(Card)}</div>
        </section>
      );
    }
    return <section className="books shelf-section"><h2>🎯 Em breve</h2></section>;
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <h2>🌙 Arcana</h2>
        <div className="user-badge-profile">✨ {user.email.split('@')[0]}</div>
        <button onClick={() => setPage("leituras")}>📚 Leituras</button>
        <button onClick={() => setPage("wishlist")}>⭐ Wishlist</button>
        
        <button onClick={() => { setOpenPasswordModal(true); setPasswordStatusMsg(""); }} className="btn-change-pass-sidebar" style={{ marginTop: 'auto', background: 'rgba(214,180,125,0.05)', border: '1px dashed rgba(214,180,125,0.2)' }}>
          🔑 Alterar Senha
        </button>
        
        <button onClick={handleLogout} className="btn-logout-sidebar" style={{ background: '#321d22', marginTop: '10px' }}>
          🚪 Fechar Círculo (Sair)
        </button>
      </aside>

      <main className="main">
        <header className="header">
          <h1>Arcana</h1>
          <p>Biblioteca mística pessoal sincronizada em nuvem</p>
        </header>
        {renderPage()}
      </main>

      {/* POP-UP ALTERAR SENHA */}
      {openPasswordModal && (
        <div className="modal-overlay" onClick={() => setOpenPasswordModal(false)}>
          <div className="modal cozy-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '350px' }}>
            <h2>🔮 Nova Palavra-Passe</h2>
            <p style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '15px' }}>Digite seu novo segredo de acesso abaixo:</p>
            <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input type={passwordTargetShow ? "text" : "password"} placeholder="Mínimo 6 dígitos" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} style={{ width: '100%', paddingRight: '40px' }} required />
                <button type="button" onClick={() => setPasswordTargetShow(!passwordTargetShow)} style={{ position: 'absolute', right: '10px', background: 'none', border: 'none', color: 'var(--gold-soft)', cursor: 'pointer' }}>{passwordTargetShow ? "👁️‍🗨️" : "👁️"}</button>
              </div>
              {passwordStatusMsg && <p style={{ fontSize: '13px', color: passwordStatusMsg.includes('sucesso') ? '#62ffb0' : '#ff6b6b', textAlign: 'center', margin: 0 }}>{passwordStatusMsg}</p>}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit" style={{ flex: 1 }}>Atualizar</button>
                <button type="button" onClick={() => setOpenPasswordModal(false)} style={{ background: '#444' }}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POP-UP DETALHES + ATUALIZADOR DIÁRIO DE LEITURA */}
      {selectedBook && (
        <div className="modal-overlay" onClick={() => setSelectedBook(null)}>
          <div className="modal book-preview-modal" onClick={(e) => e.stopPropagation()}>
            <button className="close-preview-x" onClick={() => setSelectedBook(null)}>✕</button>
            <div className="preview-layout">
              <div className="preview-left">
                <img src={selectedBook.cover || "https://via.placeholder.com/150x220"} alt={selectedBook.title} className="preview-cover" />
                <div className="preview-meta-tags">
                  {selectedBook.genre && <span className="tag-genre">🔮 {selectedBook.genre}</span>}
                  {selectedBook.pages && <span className="tag-pages">📄 {selectedBook.pages} pág.</span>}
                </div>

                {/* ATUALIZAR PROGRESOS DIRETO NO CARD */}
                {selectedBook.status === "lendo" && (
                  <div style={{ marginTop: '20px', background: 'rgba(214,180,125,0.04)', padding: '15px', borderRadius: '14px', border: '1px dashed rgba(214,180,125,0.2)' }}>
                    <h5 style={{ margin: '0 0 10px 0', color: 'var(--gold)', fontSize: '12px', letterSpacing: '0.5px' }}>📈 REGISTRAR DIÁRIO</h5>
                    <form onSubmit={handleUpdateProgress} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Pág. Atual:</span>
                        <input 
                          type="number" 
                          placeholder={selectedBook.current_page} 
                          value={inputPageUpdate}
                          onChange={(e) => setInputPageUpdate(e.target.value)}
                          style={{ padding: '6px', fontSize: '13px', flex: 1, textAlign: 'center' }}
                        />
                      </div>
                      <button type="submit" style={{ padding: '8px', fontSize: '12px', background: 'linear-gradient(135deg, #8c62ff, #62ffb0)', color: '#0c0814', fontWeight: 'bold' }}>
                        Salvar Páginas
                      </button>
                    </form>
                    {logStatusMsg && <p style={{ fontSize: '11px', color: logStatusMsg.includes('salvo') ? '#62ffb0' : '#ff6b6b', margin: '5px 0 0 0', textAlign: 'center' }}>{logStatusMsg}</p>}
                  </div>
                )}
              </div>
              
              <div className="preview-right">
                <span className="preview-status-badge">{selectedBook.status.toUpperCase()}</span>
                <h2>{selectedBook.title}</h2>
                <p className="preview-author">por {selectedBook.author}</p>
                <div className="preview-rating"><Stars value={selectedBook.rating} /></div>
                
                {/* Porcentagem dinâmica no detalhe */}
                <p className="preview-detail-text">
                  <strong>Progresso Real:</strong> {calculatePercentage(selectedBook.current_page, selectedBook.pages)}% concluído ({selectedBook.current_page} de {selectedBook.pages || "?"} pág.)
                </p>

                {selectedBook.publisher && <p className="preview-detail-text"><strong>Editora:</strong> {selectedBook.publisher}</p>}
                {(selectedBook.startDate || selectedBook.endDate) && (
                  <p className="preview-detail-text"><strong>Período:</strong> {selectedBook.startDate || "??"} até {selectedBook.endDate || "??"}</p>
                )}
                <div className="preview-summary-box">
                  <h4>Resumo da Obra</h4>
                  <p>{selectedBook.summary || "Nenhum resumo místico inserido..."}</p>
                </div>
                <div className="preview-footer-actions">
                  <button onClick={handleEditFromPreview} className="btn-edit-magic">✍️ Editar</button>
                  <button onClick={() => toggleFavorite(selectedBook.id)} className="btn-action">
                    {selectedBook.favorite ? "❤️ Favorito" : "🤍 Favoritar"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL FORMULÁRIO */}
      {openModal && (
        <div className="modal-overlay" onClick={() => { resetForm(); setOpenModal(false); }}>
          <div className="modal cozy-modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editingId ? "✨ Editar Livro" : "✨ Novo Livro"}</h2>
            <input placeholder="Título" value={form.title} onChange={(e)=>setForm({...form,title:e.target.value})}/>
            <input placeholder="Autor" value={form.author} onChange={(e)=>setForm({...form,author:e.target.value})}/>
            <input placeholder="Editora" value={form.publisher} onChange={(e)=>setForm({...form,publisher:e.target.value})}/>
            <input placeholder="Gênero" value={form.genre} onChange={(e)=>setForm({...form,genre:e.target.value})}/>
            <input placeholder="Total de Páginas" type="number" value={form.pages} onChange={(e)=>setForm({...form,pages:e.target.value})}/>
            <input placeholder="Página Atual inicial" type="number" value={form.current_page} onChange={(e)=>setForm({...form,current_page:parseInt(e.target.value)||0})}/>
            <p>Classificação</p>
            <Stars value={form.rating} onChange={(n)=>setForm({...form,rating:n})}/>
            <input type="date" value={form.startDate || ""} onChange={(e)=>setForm({...form,startDate:e.target.value})}/>
            <input type="date" value={form.endDate || ""} onChange={(e)=>setForm({...form,endDate:e.target.value})}/>
            <textarea placeholder="Resumo" value={form.summary} onChange={(e)=>setForm({...form,summary:e.target.value})}/>
            <input placeholder="URL da capa" value={form.cover} onChange={(e)=>setForm({...form,cover:e.target.value})}/>
            <input type="file" onChange={handleFile} />
            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button onClick={saveBook} style={{ flex: 1 }}>{editingId ? "Atualizar" : "Salvar no Supabase"}</button>
              <button onClick={() => { resetForm(); setOpenModal(false); }} style={{ background: '#444' }}>Fechar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;