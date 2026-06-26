import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient"; // Nossa conexão direta com a nuvem!

function App() {
  // =========================
  // AUTH STATE
  // =========================
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false); // Alterna entre Login e Cadastro
  const [authError, setAuthError] = useState("");

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
  });

  // Monitora se o usuário está logado ou não
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

  // Puxa os livros do Supabase sempre que o usuário mudar/logar
  useEffect(() => {
    if (user) {
      fetchBooks();
    } else {
      setBooks([]);
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
      // Cadastro de nova conta mística
      const { data, error } = await supabase.auth.signUp({
        email: authEmail,
        password: authPassword,
      });
      if (error) setAuthError(error.message);
      else alert("Conta criada com sucesso! Boas-vindas ao Arcana.");
    } else {
      // Login em conta existente
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

  // =========================
  // DATABASE CRUD (SUPABASE)
  // =========================
  async function fetchBooks() {
    setBooksLoading(true);
    const { data, error } = await supabase
      .from("books")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      // Adaptando nomes vindos do banco de dados (snake_case) para o front (camelCase)
      const formatted = data.map(b => ({
        ...b,
        startDate: b.start_date,
        endDate: b.end_date
      }));
      setBooks(formatted);
    }
    setBooksLoading(false);
  }

  async function saveBook() {
    if (!form.title || !form.author || !user) return;

    const formattedGenre = form.genre ? form.genre.trim() : "Outros";
    
    // Objeto mapeado exatamente para as colunas que criamos no SQL
    const bookData = {
      user_id: user.id,
      title: form.title,
      author: form.author,
      publisher: form.publisher,
      rating: form.rating,
      favorite: form.favorite,
      pages: form.pages,
      start_date: form.startDate,
      end_date: form.endDate,
      genre: formattedGenre,
      cover: form.cover,
      summary: form.summary,
      status: form.status,
    };

    if (editingId) {
      // Atualizar na Nuvem
      const { error } = await supabase
        .from("books")
        .update(bookData)
        .eq("id", editingId);

      if (!error) {
        const updatedLocal = { ...form, genre: formattedGenre, id: editingId };
        setBooks(books.map((b) => (b.id === editingId ? updatedLocal : b)));
        if (selectedBook && selectedBook.id === editingId) {
          setSelectedBook(updatedLocal);
        }
      }
    } else {
      // Inserir na Nuvem
      const { data, error } = await supabase
        .from("books")
        .insert([bookData])
        .select();

      if (!error && data) {
        const created = { ...data[0], startDate: data[0].start_date, endDate: data[0].end_date };
        setBooks([created, ...books]);
      }
    }

    resetForm();
    setOpenModal(false);
  }

  async function deleteBook(id, e) {
    if (e) e.stopPropagation();
    const { error } = await supabase.from("books").delete().eq("id", id);
    
    if (!error) {
      setBooks(books.filter((b) => b.id !== id));
      if (selectedBook && selectedBook.id === id) {
        setSelectedBook(null);
      }
    }
  }

  async function toggleFavorite(id, e) {
    if (e) e.stopPropagation();
    const currentBook = books.find(b => b.id === id);
    if (!currentBook) return;

    const nextFavoriteState = !currentBook.favorite;

    const { error } = await supabase
      .from("books")
      .update({ favorite: nextFavoriteState })
      .eq("id", id);

    if (!error) {
      setBooks(books.map((b) => b.id === id ? { ...b, favorite: nextFavoriteState } : b));
      if (selectedBook && selectedBook.id === id) {
        setSelectedBook({ ...selectedBook, favorite: nextFavoriteState });
      }
    }
  }

  async function updateStatus(id, status, e) {
    if (e) e.stopPropagation();
    const { error } = await supabase
      .from("books")
      .update({ status })
      .eq("id", id);

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
    });
    setEditingId(null);
  }

  function handleCardClick(book) {
    setSelectedBook(book); 
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
    reader.onload = () => {
      setForm({ ...form, cover: reader.result });
    };
    reader.readAsDataURL(file);
  }

  // =========================
  // FILTERS & GRAPHICS
  // =========================
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
    
    return Object.keys(counts)
      .map((genre, index) => ({
        name: genre,
        count: counts[genre],
        percentage: Math.round((counts[genre] / total) * 100),
        color: colors[index % colors.length]
      }))
      .sort((a, b) => b.count - a.count);
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

  // COMPONENTES AUXILIARES
  function Stars({ value, onChange }) {
    return (
      <div className="stars">
        {[1,2,3,4,5].map((n) => (
          <span
            key={n}
            onClick={() => onChange && onChange(n)}
            style={{
              cursor: onChange ? "pointer" : "default",
              fontSize: "20px",
              color: n <= value ? "#ffd36e" : "#444"
            }}
          >
            ★
          </span>
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

  // =========================
  // RENDER LOADING / AUTH SCREEN
  // =========================
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
              <input type="password" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} placeholder="••••••••" required />
            </div>

            {authError && <p className="auth-error-msg">⚠️ {authError}</p>}

            <button type="submit" className="btn-auth-submit">
              {isSignUp ? "Criar Grimório de Conta" : "Desbloquear Biblioteca 🔮"}
            </button>
          </form>

          <p className="auth-toggle-text">
            {isSignUp ? "Já possui chaves?" : "Novo neste círculo místico?"}{" "}
            <span onClick={() => { setIsSignUp(!isSignUp); setAuthError(""); }}>
              {isSignUp ? "Fazer Login" : "Criar uma Conta"}
            </span>
          </p>
        </div>
      </div>
    );
  }

  // =========================
  // RENDER APP PRINCIPAL (LOGADO)
  // =========================
  function renderPage() {
    if (page === "leituras") {
      const totalLivros = books.length;
      const lendoAgora = byStatus("lendo");
      const totalLidos = byStatus("lido").length;
      const totalQuero = byStatus("quero").length;

      const genreData = getGenreData();
      const pieGradient = generatePieGradient(genreData);

      return (
        <>
          {booksLoading && <p style={{ color: "var(--gold)", textAlign: "center" }}>Buscando seus feitiços na nuvem...</p>}
          
          <section className="dashboard-counters">
            <div className="counter-card total">
              <span className="counter-icon">📚</span>
              <div className="counter-info"><p>LIVROS NO TOTAL</p><h3>{totalLivros}</h3></div>
            </div>
            <div className="counter-card lendo">
              <span className="counter-icon">📖</span>
              <div className="counter-info"><p>LIVROS LENDO</p><h3>{lendoAgora.length}</h3></div>
            </div>
            <div className="counter-card lidos">
              <span className="counter-icon">📘</span>
              <div className="counter-info"><p>LIVROS LIDOS</p><h3>{totalLidos}</h3></div>
            </div>
            <div className="counter-card nao-lidos">
              <span className="counter-icon">🌙</span>
              <div className="counter-info"><p>LIVROS NÃO LIDOS</p><h3>{totalQuero}</h3></div>
            </div>
          </section>

          <section className="dashboard-middle">
            <div className="genres-box">
              <h3>GÊNEROS LIDOS ✨</h3>
              <div className="genres-content">
                <div className="pie-chart-mock" style={{ background: pieGradient }}>
                  <div className="inner-circle">🔮</div>
                </div>
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
              {lendoAgora.length > 0 ? (
                <div className="current-book-display" onClick={() => handleCardClick(lendoAgora[0])} style={{ cursor: 'pointer' }}>
                  <img src={lendoAgora[0].cover || "https://via.placeholder.com/120x180"} alt="Capa" />
                  <div className="current-book-details">
                    <h4>{lendoAgora[0].title}</h4>
                    <p>{lendoAgora[0].author}</p>
                    <div className="progress-container"><div className="progress-bar" style={{ width: '58%' }}></div></div>
                    <span className="progress-text">58% concluído</span>
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
            <div className="shelf-header">
              <h2>MEU ACERVO ✦</h2>
            </div>
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
        <button onClick={handleLogout} className="btn-logout-sidebar" style={{ marginTop: 'auto', background: '#321d22' }}>
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

      {/* POP-UP DETALHES */}
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
              </div>
              <div className="preview-right">
                <span className="preview-status-badge">{selectedBook.status.toUpperCase()}</span>
                <h2>{selectedBook.title}</h2>
                <p className="preview-author">por {selectedBook.author}</p>
                <div className="preview-rating"><Stars value={selectedBook.rating} /></div>
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
            <input placeholder="Páginas" value={form.pages} onChange={(e)=>setForm({...form,pages:e.target.value})}/>
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