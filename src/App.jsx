import { useEffect, useState } from "react";

function App() {
  // =========================
  // NAV
  // =========================
  const [page, setPage] = useState("leituras");

  // =========================
  // DATA
  // =========================
  const [books, setBooks] = useState(() => {
    const saved = localStorage.getItem("arcana-books");
    return saved ? JSON.parse(saved) : [];
  });

  // =========================
  // MODAL
  // =========================
  const [openModal, setOpenModal] = useState(false);

  // =========================
  // FORM
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

  useEffect(() => {
    localStorage.setItem("arcana-books", JSON.stringify(books));
  }, [books]);

  // =========================
  // CRUD
  // =========================
  function addBook() {
    if (!form.title || !form.author) return;

    setBooks([
      ...books,
      { ...form, id: Date.now() }
    ]);

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

    setOpenModal(false);
  }

  function deleteBook(id) {
    setBooks(books.filter((b) => b.id !== id));
  }

  function toggleFavorite(id) {
    setBooks(
      books.map((b) =>
        b.id === id ? { ...b, favorite: !b.favorite } : b
      )
    );
  }

  function updateStatus(id, status) {
    setBooks(
      books.map((b) =>
        b.id === id ? { ...b, status } : b
      )
    );
  }

  // =========================
  // FILE UPLOAD
  // =========================
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
  // FILTERS
  // =========================
  const favorites = books.filter((b) => b.favorite);
  const byStatus = (s) => books.filter((b) => b.status === s);

  // =========================
  // STARS
  // =========================
  function Stars({ value, onChange }) {
    return (
      <div className="stars">
        {[1,2,3,4,5].map((n) => (
          <span
            key={n}
            onClick={() => onChange(n)}
            style={{
              cursor: "pointer",
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

  // =========================
  // CARD
  // =========================
  function Card(book) {
    return (
      <div key={book.id} className="card book-card">

        <div className="book-layout">
          <img
            src={book.cover || "https://via.placeholder.com/120x180"}
            className="book-cover"
          />

          <div className="book-info">

            <h3>{book.title}</h3>
            <p className="author">{book.author}</p>

            <div className="book-actions">

              <button onClick={() => toggleFavorite(book.id)}>
                {book.favorite ? "⭐" : "☆"}
              </button>

              <select
                value={book.status}
                onChange={(e) =>
                  updateStatus(book.id, e.target.value)
                }
              >
                <option value="quero">Quero</option>
                <option value="lendo">Lendo</option>
                <option value="lido">Lido</option>
              </select>

              <button onClick={() => deleteBook(book.id)}>
                X
              </button>

            </div>

          </div>
        </div>

      </div>
    );
  }

  // =========================
  // PAGES
  // =========================
  function renderPage() {
    if (page === "leituras") {
      return (
        <>
          <button onClick={() => setOpenModal(true)}>
            ➕ Adicionar Livro
          </button>

          <section className="books">
            <h2>⭐ Quero Ler</h2>
            <div className="netflix-row">{byStatus("quero").map(Card)}</div>

            <h2>📖 Lendo</h2>
            <div className="netflix-row">{byStatus("lendo").map(Card)}</div>

            <h2>🏁 Lido</h2>
            <div className="netflix-row">{byStatus("lido").map(Card)}</div>
          </section>
        </>
      );
    }

    if (page === "wishlist") {
      return (
        <section className="books">
          <h2>⭐ Wishlist</h2>
          <div className="netflix-row">{favorites.map(Card)}</div>
        </section>
      );
    }

    if (page === "metas") {
      return <section className="books"><h2>🎯 Metas</h2></section>;
    }

    if (page === "desafios") {
      return <section className="books"><h2>🧿 Desafios</h2></section>;
    }
  }

  // =========================
  // UI
  // =========================
  return (
    <div className="layout">

      <aside className="sidebar">
        <h2>🌙 Arcana</h2>

        <button onClick={() => setPage("leituras")}>📚 Leituras</button>
        <button onClick={() => setPage("wishlist")}>⭐ Wishlist</button>
        <button onClick={() => setPage("metas")}>🎯 Metas</button>
        <button onClick={() => setPage("desafios")}>🧿 Desafios</button>
      </aside>

      <main className="main">

        <header className="header">
          <h1>Arcana</h1>
          <p>Biblioteca mística pessoal</p>
        </header>

        {renderPage()}

      </main>

      {/* =========================
          MODAL COZY
      ========================= */}
      {openModal && (
        <div className="modal-overlay">
          <div className="modal cozy-modal">

            <h2>✨ Novo Livro</h2>

            <input placeholder="Título"
              value={form.title}
              onChange={(e)=>setForm({...form,title:e.target.value})}
            />

            <input placeholder="Autor"
              value={form.author}
              onChange={(e)=>setForm({...form,author:e.target.value})}
            />

            <input placeholder="Editora"
              value={form.publisher}
              onChange={(e)=>setForm({...form,publisher:e.target.value})}
            />

            <input placeholder="Gênero"
              value={form.genre}
              onChange={(e)=>setForm({...form,genre:e.target.value})}
            />

            <input placeholder="Páginas"
              value={form.pages}
              onChange={(e)=>setForm({...form,pages:e.target.value})}
            />

            {/* ESTRELAS */}
            <p>Classificação</p>
            <Stars
              value={form.rating}
              onChange={(n)=>setForm({...form,rating:n})}
            />

            {/* DATAS */}
            <input type="date"
              value={form.startDate}
              onChange={(e)=>setForm({...form,startDate:e.target.value})}
            />

            <input type="date"
              value={form.endDate}
              onChange={(e)=>setForm({...form,endDate:e.target.value})}
            />

            <textarea
              placeholder="Resumo"
              value={form.summary}
              onChange={(e)=>setForm({...form,summary:e.target.value})}
            />

            <input
              placeholder="URL da capa"
              value={form.cover}
              onChange={(e)=>setForm({...form,cover:e.target.value})}
            />

            <input type="file" onChange={handleFile} />

            <button onClick={addBook}>Salvar</button>
            <button onClick={()=>setOpenModal(false)}>Fechar</button>

          </div>
        </div>
      )}

    </div>
  );
}

export default App;