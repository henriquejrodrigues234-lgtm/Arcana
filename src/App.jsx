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
  const [digitalItems, setDigitalItems] = useState([]);
  const [digitalForm, setDigitalForm] = useState({ title: "", author: "", format: "audio", source: "", cover: "", notes: "", consumed: false, consumed_at: null, start_date: "", end_date: "", rating: 0 });
  const [digitalModalOpen, setDigitalModalOpen] = useState(false);
  const [digitalEditingId, setDigitalEditingId] = useState(null);
  const [selectedDigitalItem, setSelectedDigitalItem] = useState(null);
  const [books, setBooks] = useState([]);
  const [booksLoading, setBooksLoading] = useState(false);
  const [openModal, setOpenModal] = useState(false);
  const [editingId, setEditingId] = useState(null); 
  const [selectedBook, setSelectedBook] = useState(null); 
  const [currentReadingIndex, setCurrentReadingIndex] = useState(0);
  const [shelfFilter, setShelfFilter] = useState("todos");
  const [shelfYearFilter, setShelfYearFilter] = useState("todos");

  // =========================
  // RASTREAMENTO & METAS
  // =========================
  const [readingLogs, setReadingLogs] = useState([]);
  const [inputPageUpdate, setInputPageUpdate] = useState("");
  const [logStatusMsg, setLogStatusMsg] = useState("");
  const [readingGoal, setReadingGoal] = useState(1000); 
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date()); 

  const [openLogModal, setOpenLogModal] = useState(false);
  const [logForm, setLogForm] = useState({
    book_id: "",
    pages_read: "",
    logged_at: new Date().toISOString().split('T')[0]
  });
  const [quickLogMsg, setQuickLogMsg] = useState("");

  // =========================
  // FORM STATE (LIVROS)
  // =========================
  const [form, setForm] = useState({
    title: "", author: "", publisher: "", rating: 0, favorite: false,
    pages: "", startDate: "", endDate: "", genre: "", cover: "", summary: "",
    status: "quero", current_page: 0
  });

  // =========================
  // GENRES (GÊNEROS) STATE
  // =========================
  const [genres, setGenres] = useState([]);
  const [showNewGenreInput, setShowNewGenreInput] = useState(false);
  const [newGenreValue, setNewGenreValue] = useState("");

  // =========================
  // STATE DA WISHLIST
  // =========================
  const [wishlistItems, setWishlistItems] = useState([]);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [openWishlistModal, setOpenWishlistModal] = useState(false);
  const [editingWishlistId, setEditingWishlistId] = useState(null);

  // Filtros e buscas da Wishlist
  const [wishlistSort, setWishlistSort] = useState("prioridade"); // prioridade, menor_preco, maior_preco
  const [wishlistFilterStatus, setWishlistFilterStatus] = useState("todos"); // todos, quero, comprado
  const [wishlistSearch, setWishlistSearch] = useState("");

  // Form da Wishlist (Baseado no Pop-up da foto)
  const [wishlistForm, setWishlistForm] = useState({
    title: "",
    author: "",
    priority: "Média",
    price: "",
    buy_url: "",
    status: "quero",
    notes: "",
    cover: ""
  });

  const [goals, setGoals] = useState({
    pagesPerDay: 30,
    booksPerMonth: 2,
    booksPerYear: 24
  });
  const [beforeThirtyBooks, setBeforeThirtyBooks] = useState([]);
  const [beforeThirtyForm, setBeforeThirtyForm] = useState({ title: "", author: "", cover: "", read: false, read_at: null });
  const [openBeforeThirtyModal, setOpenBeforeThirtyModal] = useState(false);

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
      fetchWishlist();
      fetchBeforeThirtyFromDb();
      fetchGenresFromDb();
      fetchDigitalFromDb();

      const savedGoals = localStorage.getItem(`arcana-goals-${user.id}`);
      if (savedGoals) {
        try { setGoals(JSON.parse(savedGoals)); } catch (e) { setGoals({ pagesPerDay: 30, booksPerMonth: 2, booksPerYear: 24 }); }
      }

      const savedGenres = localStorage.getItem(`arcana-genres-${user.id}`);
      if (savedGenres) {
        try { setGenres(JSON.parse(savedGenres)); } catch (e) { setGenres([]); }
      } else {
        setGenres(["Fantasia", "Ficção Científica", "Romance", "Mistério", "Não-ficção", "Terror", "Biografia", "Outros"]);
      }
    } else {
      setBooks([]);
      setReadingLogs([]);
      setWishlistItems([]);
      setGoals({ pagesPerDay: 30, booksPerMonth: 2, booksPerYear: 24 });
      setBeforeThirtyBooks([]);
      setBeforeThirtyForm({ title: "", author: "", cover: "", read: false });
      setDigitalItems([]);
      setDigitalForm({ title: "", author: "", format: "audio", source: "", cover: "", notes: "", consumed: false, consumed_at: null, start_date: "", end_date: "", rating: 0 });
      setDigitalModalOpen(false);
      setDigitalEditingId(null);
      setSelectedDigitalItem(null);
    }
  }, [user]);

  // persist genres per user
  useEffect(() => {
    if (!user) return;
    localStorage.setItem(`arcana-genres-${user.id}`, JSON.stringify(genres));
  }, [user, genres]);

  useEffect(() => {
    if (!user) return;
    localStorage.setItem(`arcana-goals-${user.id}`, JSON.stringify(goals));
  }, [user, goals]);

  useEffect(() => {
    if (!user) return;
    try { localStorage.setItem(`arcana-goals-${user.id}`, JSON.stringify(goals)); } catch (e) {}
  }, [user, goals]);

  useEffect(() => {
    if (!user) return;
    localStorage.setItem(`arcana-genres-${user.id}`, JSON.stringify(genres));
  }, [user, genres]);

  // =========================
  // METODOS DE AUTENTICAÇÃO
  // =========================
  async function handleAuth(e) {
    e.preventDefault();
    setAuthError("");
    if (!authEmail || !authPassword) return;

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email: authEmail, password: authPassword });
      if (error) setAuthError(error.message);
      else alert("Conta criada com sucesso! Boas-vindas ao Arcana.");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword });
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
    if (!user) return;
    setBooksLoading(true);
    const { data, error } = await supabase.from("books").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    if (!error && data) {
      setBooks(data.map(b => ({ ...b, startDate: b.start_date, endDate: b.end_date, current_page: b.current_page || 0 })));
    }
    setBooksLoading(false);
  }

  async function fetchLogs() {
    if (!user) return;
    const { data, error } = await supabase.from("reading_logs").select("*").eq("user_id", user.id).order("logged_at", { ascending: false });
    if (!error && data) setReadingLogs(data);
  }

  async function saveBook() {
    if (!form.title || !form.author || !user) return;
    const formattedGenre = form.genre ? form.genre.trim() : "Outros";
    const totalPagesNum = parseInt(form.pages) || 0;
    
    const bookData = {
      user_id: user.id, title: form.title, author: form.author, publisher: form.publisher, rating: form.rating,
      favorite: form.favorite, pages: totalPagesNum > 0 ? totalPagesNum.toString() : "", start_date: form.startDate,
      end_date: form.endDate, genre: formattedGenre, cover: form.cover, summary: form.summary, status: form.status,
      current_page: parseInt(form.current_page) || 0
    };

    if (editingId) {
      const { error } = await supabase.from("books").update(bookData).eq("id", editingId);
      if (!error) {
        const updatedLocal = { ...form, genre: formattedGenre, id: editingId, current_page: parseInt(form.current_page) || 0 };
        setBooks(books.map((b) => (b.id === editingId ? updatedLocal : b)));
        if (selectedBook && selectedBook.id === editingId) setSelectedBook(updatedLocal);
      }
    } else {
      const { data, error } = await supabase.from("books").insert([bookData]).select();
      if (!error && data) {
        setBooks([{ ...data[0], startDate: data[0].start_date, endDate: data[0].end_date, current_page: data[0].current_page || 0 }, ...books]);
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

    if (isNaN(targetPage) || targetPage < 0 || (totalPages > 0 && targetPage > totalPages)) {
      setLogStatusMsg("⚠️ Insira uma página válida.");
      return;
    }

    const pagesJustRead = targetPage - selectedBook.current_page;
    const { error: bookError } = await supabase.from("books").update({ current_page: targetPage }).eq("id", selectedBook.id);

    if (!bookError) {
      if (pagesJustRead > 0) {
        await supabase.from("reading_logs").insert([{ user_id: user.id, book_id: selectedBook.id, pages_read: pagesJustRead }]);
        fetchLogs();
      }
      let updatedBook = { ...selectedBook, current_page: targetPage };
      const totalPagesNum = parseInt(selectedBook.pages) || 0;
      if (totalPagesNum > 0 && targetPage >= totalPagesNum) {
        // mark as read
        const end_date = new Date().toISOString().split('T')[0];
        await supabase.from('books').update({ status: 'lido', end_date }).eq('id', selectedBook.id);
        updatedBook = { ...updatedBook, status: 'lido', endDate: end_date, end_date };
      }
      setBooks(books.map(b => b.id === selectedBook.id ? updatedBook : b));
      setSelectedBook(updatedBook);
      setInputPageUpdate("");
      setLogStatusMsg("🔮 Progresso salvo e log registrado!");
    }
  }

  async function handleSaveQuickLog(e) {
    e.preventDefault();
    setQuickLogMsg("");
    const targetBookIdRaw = logForm.book_id;
    const targetBookId = isNaN(parseInt(targetBookIdRaw)) ? targetBookIdRaw : parseInt(targetBookIdRaw);
    const pagesReadNum = parseInt(logForm.pages_read);

    if (!targetBookId || isNaN(pagesReadNum) || pagesReadNum <= 0) {
      setQuickLogMsg("⚠️ Dados inválidos.");
      return;
    }

    const selectedTargetBook = books.find(b => String(b.id) === String(targetBookId));
    if (!selectedTargetBook) return;

    const nextPagesTotal = (selectedTargetBook.current_page || 0) + pagesReadNum;
    const totalBookPages = parseInt(selectedTargetBook.pages) || 0;

    if (totalBookPages > 0 && nextPagesTotal > totalBookPages) {
      setQuickLogMsg(`⚠️ Ultrapassa as ${totalBookPages} páginas totais.`);
      return;
    }

    const { error: logError } = await supabase.from("reading_logs").insert([
      { user_id: user.id, book_id: targetBookId, pages_read: pagesReadNum, logged_at: new Date(logForm.logged_at + "T12:00:00").toISOString() }
    ]);

    if (!logError) {
      await supabase.from("books").update({ current_page: nextPagesTotal }).eq("id", targetBookId);
      // if we've completed the book, mark as read and set end_date
      if (totalBookPages > 0 && nextPagesTotal >= totalBookPages) {
        const end_date = new Date().toISOString().split('T')[0];
        await supabase.from('books').update({ status: 'lido', end_date }).eq('id', targetBookId);
        setBooks(books.map(b => b.id === targetBookId ? { ...b, current_page: nextPagesTotal, status: 'lido', endDate: end_date, end_date } : b));
      } else {
        setBooks(books.map(b => b.id === targetBookId ? { ...b, current_page: nextPagesTotal } : b));
      }
      fetchLogs();
      setQuickLogMsg("🔮 Páginas integradas!");
      setTimeout(() => {
        setOpenLogModal(false);
        setLogForm({ book_id: "", pages_read: "", logged_at: new Date().toISOString().split('T')[0] });
      }, 1500);
    }
  }

  async function deleteLog(id) {
    if (!window.confirm("Deseja remover este registro de leitura?")) return;
    const { error } = await supabase.from("reading_logs").delete().eq("id", id);
    if (!error) {
      setReadingLogs(readingLogs.filter(l => l.id !== id));
    } else {
      alert("⚠️ Erro ao remover registro.");
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
      if (selectedBook && selectedBook.id === id) setSelectedBook({ ...selectedBook, favorite: nextFavoriteState });
    }
  }

  async function updateStatus(id, status, e) {
    if (e) e.stopPropagation();
    const payload = { status };
    if (status === 'lido') payload.end_date = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase.from("books").update(payload).eq("id", id).select();
    if (!error) {
      const updated = data && data[0] ? { ...data[0], startDate: data[0].start_date, endDate: data[0].end_date, current_page: data[0].current_page || 0 } : null;
      setBooks(books.map((b) => b.id === id ? (updated || { ...b, ...payload }) : b));
      if (selectedBook && selectedBook.id === id) setSelectedBook(updated || { ...selectedBook, ...payload });
    }
  }

  function resetForm() {
    setForm({ title: "", author: "", publisher: "", rating: 0, favorite: false, pages: "", startDate: "", endDate: "", genre: "", cover: "", summary: "", status: "quero", current_page: 0 });
    setEditingId(null);
    setShowNewGenreInput(false);
    setNewGenreValue("");
  }

  async function fetchGenresFromDb() {
    if (!user) return;
    const { data, error } = await supabase.from('genres').select('name').eq('user_id', user.id).order('created_at', { ascending: false });
    if (!error && data && data.length > 0) {
      const names = data.map((g) => g.name).filter(Boolean);
      if (names.length) {
        setGenres(names);
        try { localStorage.setItem(`arcana-genres-${user.id}`, JSON.stringify(names)); } catch (e) { }
      }
    }
  }

  async function saveGenreToDb(name) {
    const v = (name || '').trim();
    if (!v) return;
    // optimistic local update
    if (!genres.includes(v)) {
      setGenres((prev) => [v, ...prev]);
      try { localStorage.setItem(`arcana-genres-${user?.id || 'anon'}`, JSON.stringify([v, ...genres])); } catch (e) { }
    }
    if (!user) return;
    const { data, error } = await supabase.from('genres').insert([{ user_id: user.id, name: v }]).select();
    if (!error && data && data[0]) {
      const inserted = data[0].name;
      if (!genres.includes(inserted)) setGenres((prev) => [inserted, ...prev]);
      try { localStorage.setItem(`arcana-genres-${user.id}`, JSON.stringify([inserted, ...genres])); } catch (e) { }
    }
  }

  async function addGenre(value) {
    const v = (value || newGenreValue || "").trim();
    if (!v) return;
    await saveGenreToDb(v);
    setForm({ ...form, genre: v });
    setShowNewGenreInput(false);
    setNewGenreValue("");
  }

  function handleGoalChange(key, value) {
    const numericValue = parseInt(value, 10);
    setGoals((prev) => ({
      ...prev,
      [key]: Number.isNaN(numericValue) ? 0 : Math.max(0, numericValue)
    }));
  }

  // =========================================
  // METODOS DA WISHLIST (NOVO)
  // =========================================
  async function fetchWishlist() {
    if (!user) return;
    setWishlistLoading(true);
    const { data, error } = await supabase.from("wishlist").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    if (!error && data) setWishlistItems(data);
    setWishlistLoading(false);
  }

  async function saveWishlistItem(e) {
    e.preventDefault();
    if (!wishlistForm.title || !wishlistForm.author || !user) return;

    const dataPayload = {
      user_id: user.id,
      title: wishlistForm.title,
      author: wishlistForm.author,
      priority: wishlistForm.priority,
      price: parseFloat(wishlistForm.price) || 0.00,
      buy_url: wishlistForm.buy_url,
      status: wishlistForm.status,
      notes: wishlistForm.notes,
      cover: wishlistForm.cover,
      bought_at: wishlistForm.status === "comprado" ? new Date().toISOString().split('T')[0] : null
    };

    if (editingWishlistId) {
      const { error } = await supabase.from("wishlist").update(dataPayload).eq("id", editingWishlistId).eq("user_id", user.id);
      if (!error) {
        setWishlistItems(wishlistItems.map(item => item.id === editingWishlistId ? { ...item, ...dataPayload } : item));
      }
    } else {
      const { data, error } = await supabase.from("wishlist").insert([dataPayload]).select();
      if (!error && data) setWishlistItems([data[0], ...wishlistItems]);
    }

    resetWishlistForm();
    setOpenWishlistModal(false);
  }

  async function deleteWishlistItem(id) {
    if (!window.confirm("Deseja remover este item da sua Wishlist?")) return;
    const { error } = await supabase.from("wishlist").delete().eq("id", id).eq("user_id", user.id);
    if (!error) setWishlistItems(wishlistItems.filter(item => item.id !== id));
  }

  async function toggleWishlistStatus(item) {
    const nextStatus = item.status === "quero" ? "comprado" : "quero";
    const dateBought = nextStatus === "comprado" ? new Date().toISOString().split('T')[0] : null;

    const { error } = await supabase.from("wishlist").update({ status: nextStatus, bought_at: dateBought }).eq("id", item.id).eq("user_id", user.id);
    if (!error) {
      setWishlistItems(wishlistItems.map(i => i.id === item.id ? { ...i, status: nextStatus, bought_at: dateBought } : i));
    }
  }

  function handleEditWishlist(item) {
    setWishlistForm({
      title: item.title,
      author: item.author,
      priority: item.priority || "Média",
      price: item.price || "",
      buy_url: item.buy_url || "",
      status: item.status || "quero",
      notes: item.notes || "",
      cover: item.cover || ""
    });
    setEditingWishlistId(item.id);
    setOpenWishlistModal(true);
  }

  function resetWishlistForm() {
    setWishlistForm({ title: "", author: "", priority: "Média", price: "", buy_url: "", status: "quero", notes: "", cover: "" });
    setEditingWishlistId(null);
  }

  function handleWishlistFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setWishlistForm({ ...wishlistForm, cover: reader.result });
    reader.readAsDataURL(file);
  }

  // =========================================
  // PROCESSAMENTO DE FILTROS DA WISHLIST
  // =========================================
  const filteredWishlist = wishlistItems
    .filter(item => {
      // Busca por Nome ou Autor
      const matchesSearch = item.title.toLowerCase().includes(wishlistSearch.toLowerCase()) || 
                            item.author.toLowerCase().includes(wishlistSearch.toLowerCase());
      // Filtro por Status
      const matchesStatus = wishlistFilterStatus === "todos" || item.status === wishlistFilterStatus;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      // Opções de ordenação
      if (wishlistSort === "prioridade") {
        const weight = { "Alta": 3, "Média": 2, "Baixa": 1 };
        return (weight[b.priority] || 0) - (weight[a.priority] || 0);
      }
      if (wishlistSort === "menor_preco") return (a.price || 0) - (b.price || 0);
      if (wishlistSort === "maior_preco") return (b.price || 0) - (a.price || 0);
      return 0;
    });

  // Cálculos do Dashboard da Wishlist
  const totalWishlistItems = wishlistItems.length;
  const totalComprados = wishlistItems.filter(i => i.status === "comprado").length;
  const totalFaltam = wishlistItems.filter(i => i.status === "quero").length;
  const orcamentoNecessario = wishlistItems
    .filter(i => i.status === "quero")
    .reduce((acc, curr) => acc + (parseFloat(curr.price) || 0), 0);

  // =========================
  // AUXILIARES DE ESTILOS
  // =========================
  function handleCardClick(book) {
    setSelectedBook(book); 
    setLogStatusMsg("");
    setInputPageUpdate("");
  }

  function handleEditFromPreview() {
    setForm({
      title: selectedBook.title || "", author: selectedBook.author || "", publisher: selectedBook.publisher || "",
      rating: selectedBook.rating || 0, favorite: selectedBook.favorite || false, pages: selectedBook.pages || "",
      startDate: selectedBook.startDate || selectedBook.start_date || "", endDate: selectedBook.endDate || selectedBook.end_date || "",
      genre: selectedBook.genre || "", cover: selectedBook.cover || "", summary: selectedBook.summary || "",
      status: selectedBook.status || "quero", current_page: selectedBook.current_page || 0
    });
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

  async function addBeforeThirtyBook(e) {
    e.preventDefault();
    const title = beforeThirtyForm.title.trim();
    const author = beforeThirtyForm.author.trim();
    if (!title || !user) return;
    const payload = {
      user_id: user.id,
      title,
      author,
      cover: beforeThirtyForm.cover ? beforeThirtyForm.cover.trim() : null,
      read: !!beforeThirtyForm.read,
      read_at: beforeThirtyForm.read ? new Date().toISOString().split('T')[0] : null
    };
    const { data, error } = await supabase.from('before_thirty').insert([payload]).select();
    if (!error && data && data[0]) {
      setBeforeThirtyBooks([data[0], ...beforeThirtyBooks]);
    }
    setBeforeThirtyForm({ title: "", author: "", cover: "", read: false, read_at: null });
    setOpenBeforeThirtyModal(false);
  }

  async function removeBeforeThirtyBook(index) {
    const item = beforeThirtyBooks[index];
    if (!item || !item.id) return;

    const { error } = await supabase.from('before_thirty').delete().eq('id', item.id).eq('user_id', user.id);
    if (!error) {
      const updated = beforeThirtyBooks.filter((_, i) => i !== index);
      setBeforeThirtyBooks(updated);
    }
  }

  function getStatsByPeriod() {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    const dayOfWeek = startOfToday.getDay();
    const diffToMonday = (dayOfWeek + 6) % 7;
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfToday.getDate() - diffToMonday);
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    let dayTotal = 0;
    let weekTotal = 0;
    let monthTotal = 0;

    readingLogs.forEach((log) => {
      const logDate = new Date(log.logged_at);
      const logTime = logDate.getTime();

      if (logTime >= startOfToday.getTime() && logTime < endOfToday.getTime()) {
        dayTotal += log.pages_read;
      }

      if (logTime >= startOfWeek.getTime() && logTime < endOfWeek.getTime()) {
        weekTotal += log.pages_read;
      }

      if (logTime >= startOfMonth.getTime() && logTime < endOfMonth.getTime()) {
        monthTotal += log.pages_read;
      }
    });

    return { dayTotal, weekTotal, monthTotal };
  }

  const favorites = books.filter((b) => b.favorite);
  const byStatus = (s) => books.filter((b) => b.status === s);
  const availableCompletionYears = [...new Set(
    books
      .filter((book) => book.status === 'lido' && (book.end_date || book.endDate))
      .map((book) => {
        const rawDate = book.end_date || book.endDate;
        const parsed = new Date(rawDate + (rawDate.includes('T') ? '' : 'T12:00:00'));
        const year = parsed.getFullYear();
        return Number.isFinite(year) && !Number.isNaN(year) ? year : null;
      })
      .filter((year) => year !== null)
  )].sort((a, b) => b - a);

  function getGenreData() {
    if (books.length === 0) return [];
    const counts = {};
    books.forEach((book) => { const g = book.genre || "Outros"; counts[g] = (counts[g] || 0) + 1; });
    const colors = ["#8c62ff", "#ff62b0", "#62ffb0", "#ffd36e", "#ff9f43", "#4db5ff", "#b8a8c7"];
    const total = books.length;
    return Object.keys(counts).map((genre, index) => ({
      name: genre, count: counts[genre], percentage: Math.round((counts[genre] / total) * 100), color: colors[index % colors.length]
    })).sort((a, b) => b.count - a.count);
  }

  function getYearlyReadCounts() {
    const counts = {};

    books.forEach((book) => {
      const isRead = book.status === 'lido';
      const rawDate = book.end_date || book.endDate;
      if (!isRead || !rawDate) return;

      const date = new Date(rawDate);
      const year = date.getFullYear();
      if (!Number.isFinite(year) || Number.isNaN(year)) return;

      counts[year] = (counts[year] || 0) + 1;
    });

    return Object.keys(counts)
      .map((year) => ({ year: parseInt(year, 10), count: counts[year] }))
      .sort((a, b) => b.year - a.year);
  }

  // fetch before_thirty entries from Supabase
  async function fetchBeforeThirtyFromDb() {
    if (!user) return;
    const { data, error } = await supabase.from('before_thirty').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    if (!error) {
      setBeforeThirtyBooks(data || []);
    }
  }

  // digital/audio items helpers
  async function fetchDigitalFromDb() {
    if (!user) return;
    try {
      const { data, error } = await supabase.from('digital_items').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
      if (!error) {
        setDigitalItems(data || []);
      }
    } catch (e) {
      console.error('Erro ao buscar digital_items do usuário', e);
    }
  }

  function openDigitalModal(item = null) {
    if (item) {
      setDigitalEditingId(item.id || null);
      setSelectedDigitalItem(item);
      setDigitalForm({
        title: item.title || "",
        author: item.author || "",
        format: item.format || "audio",
        source: item.source || "",
        cover: item.cover || "",
        notes: item.notes || "",
        consumed: !!item.consumed,
        consumed_at: item.consumed_at || null,
        start_date: item.start_date || item.startDate || "",
        end_date: item.end_date || item.endDate || "",
        rating: Number(item.rating) || 0,
      });
    } else {
      setDigitalEditingId(null);
      setSelectedDigitalItem(null);
      setDigitalForm({ title: "", author: "", format: "audio", source: "", cover: "", notes: "", consumed: false, consumed_at: null, start_date: "", end_date: "", rating: 0 });
    }
    setDigitalModalOpen(true);
  }

  function closeDigitalModal() {
    setDigitalModalOpen(false);
    setDigitalEditingId(null);
    setSelectedDigitalItem(null);
    setDigitalForm({ title: "", author: "", format: "audio", source: "", cover: "", notes: "", consumed: false, consumed_at: null, start_date: "", end_date: "", rating: 0 });
  }

  async function saveDigitalItem(e) {
    if (e && e.preventDefault) e.preventDefault();
    const title = (digitalForm.title || '').trim();
    if (!title) return;

    if (!user) {
      alert('Você precisa estar logado para salvar itens digitais.');
      closeDigitalModal();
      return;
    }

    const payload = {
      user_id: user.id,
      title,
      author: digitalForm.author || '',
      format: digitalForm.format || 'audio',
      source: digitalForm.source || '',
      cover: digitalForm.cover || null,
      notes: digitalForm.notes || '',
      consumed: !!digitalForm.consumed,
      consumed_at: digitalForm.consumed ? (digitalForm.consumed_at || new Date().toISOString().split('T')[0]) : null,
      start_date: digitalForm.start_date || null,
      end_date: digitalForm.end_date || null,
      rating: Number(digitalForm.rating) || 0,
    };

    try {
      if (digitalEditingId) {
        const { error } = await supabase.from('digital_items').update(payload).eq('id', digitalEditingId).eq('user_id', user.id);
        if (error) {
          console.error('Erro ao atualizar item digital:', error);
          return;
        }
      } else {
        const { error } = await supabase.from('digital_items').insert([payload]);
        if (error) {
          console.error('Erro ao salvar item digital:', error);
          return;
        }
      }

      const { data } = await supabase.from('digital_items').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
      setDigitalItems(data || []);
    } catch (e) {
      console.error('Erro no fluxo de salvamento de digital_items:', e);
    } finally {
      setDigitalEditingId(null);
      setSelectedDigitalItem(null);
      setDigitalModalOpen(false);
      setDigitalForm({ title: "", author: "", format: "audio", source: "", cover: "", notes: "", consumed: false, consumed_at: null, start_date: "", end_date: "", rating: 0 });
    }
  }

  async function removeDigitalItem(item) {
    const target = item && item.id ? item : digitalItems.find((digitalItem) => digitalItem.id === digitalEditingId);
    if (!target || !target.id) return;

    const { error } = await supabase.from('digital_items').delete().eq('id', target.id).eq('user_id', user.id);
    if (!error) {
      setDigitalItems((current) => current.filter((digitalItem) => digitalItem.id !== target.id));
      if (user) {
        await fetchDigitalFromDb();
      }
    }

    setSelectedDigitalItem(null);
    setDigitalEditingId(null);
    closeDigitalModal();
  }

  async function toggleDigitalConsumed(item) {
    if (!item || !item.id) return;
    const next = !item.consumed;
    const consumed_at = next ? new Date().toISOString().split('T')[0] : null;

    const { error } = await supabase.from('digital_items').update({ consumed: next, consumed_at }).eq('id', item.id).eq('user_id', user.id);
    if (!error) {
      setDigitalItems((current) => current.map((digitalItem) => digitalItem.id === item.id ? { ...digitalItem, consumed: next, consumed_at } : digitalItem));
    }
  }

  async function toggleBeforeThirtyRead(index) {
    const item = beforeThirtyBooks[index];
    if (!item || !item.id) return;
    const nextRead = !item.read;
    const read_at = nextRead ? new Date().toISOString().split('T')[0] : null;

    const { error } = await supabase.from('before_thirty').update({ read: nextRead, read_at }).eq('id', item.id).eq('user_id', user.id);
    if (!error) {
      const updated = [...beforeThirtyBooks];
      updated[index] = { ...updated[index], read: nextRead, read_at };
      setBeforeThirtyBooks(updated);
    }
  }

  function generatePieGradient(genreData) {
    if (genreData.length === 0) return "#444";
    let currentAngle = 0;
    const gradientParts = genreData.map((genre) => {
      const start = currentAngle; currentAngle += genre.percentage;
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

  // Navegação entre livros que estão com status 'lendo'
  function prevReading() {
    const lendo = byStatus("lendo");
    if (!lendo || lendo.length === 0) return;
    setCurrentReadingIndex((i) => (i - 2 + lendo.length) % lendo.length);
  }

  function nextReading() {
    const lendo = byStatus("lendo");
    if (!lendo || lendo.length === 0) return;
    setCurrentReadingIndex((i) => (i + 2) % lendo.length);
  }

  useEffect(() => {
    const lendo = byStatus("lendo");
    if (!lendo || lendo.length === 0) {
      setCurrentReadingIndex(0);
    } else if (currentReadingIndex >= lendo.length) {
      setCurrentReadingIndex(0);
    }
  }, [books]);

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
                <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '10px', background: 'none', border: 'none', color: 'var(--gold-soft)', cursor: 'pointer', fontSize: '16px' }}>{showPassword ? "👁️‍🗨️" : "👁"}</button>
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
      const yearlyCounts = getYearlyReadCounts();
      const maxYearCount = yearlyCounts.length ? Math.max(...yearlyCounts.map(y => y.count)) : 1;
      const { dayTotal, weekTotal, monthTotal } = getStatsByPeriod();

      const currentReadingWindow = lendoAgora.length > 0
        ? Array.from({ length: Math.min(2, lendoAgora.length) }, (_, offset) => lendoAgora[(currentReadingIndex + offset) % lendoAgora.length])
        : [];
      const showReadingArrows = lendoAgora.length > 2;

      return (
        <>
          {booksLoading && <p style={{ color: "var(--gold)", textAlign: "center" }}>Buscando seus feitiços na nuvem...</p>}
          
          <section className="dashboard-counters">
            <div className="counter-card total"><span className="counter-icon">📚</span><div className="counter-info"><p>LIVROS NO TOTAL</p><h3>{totalLivros}</h3></div></div>
            <div className="counter-card lendo"><span className="counter-icon">📖</span><div className="counter-info"><p>LIVROS LENDO</p><h3>{lendoAgora.length}</h3></div></div>
            <div className="counter-card lidos"><span className="counter-icon">📘</span><div className="counter-info"><p>LIVROS LIDOS</p><h3>{totalLidos}</h3></div></div>
            <div className="counter-card nao-lidos"><span className="counter-icon">🌙</span><div className="counter-info"><p>LIVROS NÃO LIDOS</p><h3>{totalQuero}</h3></div></div>
          </section>

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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 160px', gap: '18px', alignItems: 'stretch' }}>
              <div className="genres-box">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <h3>GÊNEROS LIDOS ✨</h3>
                </div>
                <div className="genres-grid">
                  <div className="genres-graphs">
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
              </div>

              <div className="card yearly-card" style={{ padding: '12px' }}>
                <h3 style={{ fontFamily: 'Cinzel, serif', fontSize: '16px', color: 'var(--gold-soft)', margin: '0 0 12px 0' }}>📆 Livros por ano</h3>
                {yearlyCounts.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '320px', overflowY: 'auto' }}>
                    {yearlyCounts.map((y) => (
                      <div key={y.year} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '64px', color: 'var(--muted)' }}>{y.year}</div>
                        <div style={{ flex: 1, background: 'rgba(255,255,255,0.03)', height: '12px', borderRadius: '8px', overflow: 'hidden' }}>
                          <div style={{ width: `${Math.round((y.count / maxYearCount) * 100)}%`, height: '100%', background: 'linear-gradient(90deg,#8c62ff,#62ffb0)' }}></div>
                        </div>
                        <div style={{ width: '36px', textAlign: 'right', color: 'var(--muted)' }}>{y.count}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="empty-text">Nenhum livro finalizado ainda.</p>
                )}
              </div>

              <div className="card add-book-card" style={{ padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '22px', marginBottom: '6px' }}>📚</div>
                  <button onClick={() => { resetForm(); setOpenModal(true); }} className="btn-add-magic" style={{ padding: '10px 14px', fontSize: '14px' }}>+ Adicionar livro</button>
                </div>
              </div>
            </div>
          </section>

          <section className="dashboard-lower">
            <div className="current-reading-section">
              <h3>LENDO AGORA ✨</h3>
              {lendoAgora.length > 0 ? (
                <div style={{ display: 'flex', alignItems: 'stretch', gap: '12px' }}>
                  {showReadingArrows && (
                    <button onClick={(e) => { e.stopPropagation(); prevReading(); }} style={{ background: 'none', border: 'none', color: 'var(--gold-soft)', fontSize: '20px', cursor: 'pointer', alignSelf: 'center' }}>◀</button>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px', flex: 1, minWidth: 0 }}>
                    {currentReadingWindow.map((book) => {
                      const pct = calculatePercentage(book.current_page, book.pages);

                      return (
                        <div key={book.id} className="current-book-display" onClick={() => handleCardClick(book)} style={{ cursor: 'pointer', minWidth: 0, alignItems: 'flex-start' }}>
                          <img src={book.cover || "https://via.placeholder.com/120x180"} alt="Capa" />
                          <div className="current-book-details">
                            <h4>{book.title}</h4>
                            <p>{book.author}</p>
                            <div className="progress-container">
                              <div className="progress-bar" style={{ width: `${pct}%` }}></div>
                            </div>
                            <span className="progress-text">{pct}% concluído ({book.current_page}/{book.pages || "?"} pág)</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {showReadingArrows && (
                    <button onClick={(e) => { e.stopPropagation(); nextReading(); }} style={{ background: 'none', border: 'none', color: 'var(--gold-soft)', fontSize: '20px', cursor: 'pointer', alignSelf: 'center' }}>▶</button>
                  )}
                </div>
              ) : (
                <p className="empty-text">Nenhum livro sendo lido no momento.</p>
              )}
            </div>

            <div className="favorites-section">
              <h3>FAVORITOS 💖</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => {
                    const container = document.getElementById('favorites-scroll');
                    if (container) container.scrollBy({ left: -220, behavior: 'smooth' });
                  }}
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(214,180,125,0.2)', color: 'var(--gold-soft)', width: '32px', height: '32px', padding: 0, borderRadius: '50%', fontSize: '18px', flexShrink: 0 }}
                >◀</button>

                <div id="favorites-scroll" style={{ display: 'flex', gap: '14px', overflowX: 'auto', scrollBehavior: 'smooth', paddingBottom: '6px', flex: 1 }}>
                  {favorites.map((book) => (
                    <div key={book.id} className="fav-mini-card" onClick={() => handleCardClick(book)} style={{ cursor: 'pointer', minWidth: '110px', flex: '0 0 110px' }}>
                      <img src={book.cover || "https://via.placeholder.com/120x180"} alt={book.title} />
                      <h5>{book.title}</h5>
                      <div className="stars-mini">
                        {Array.from({ length: book.rating }).map((_, i) => <span key={i}>★</span>)}
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const container = document.getElementById('favorites-scroll');
                    if (container) container.scrollBy({ left: 220, behavior: 'smooth' });
                  }}
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(214,180,125,0.2)', color: 'var(--gold-soft)', width: '32px', height: '32px', padding: 0, borderRadius: '50%', fontSize: '18px', flexShrink: 0 }}
                >▶</button>
              </div>
            </div>
          </section>

          <section className="books shelf-section">
  <div className="shelf-header"><h2>MEU ACERVO ✦</h2></div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={{ color: 'var(--muted)', fontSize: '13px' }}>Status:</label>
            <select value={shelfFilter} onChange={(e) => setShelfFilter(e.target.value)} style={{ width: '160px' }}>
              <option value="todos">Todos</option>
              <option value="lido">Lido</option>
              <option value="lendo">Lendo</option>
              <option value="quero">Quero</option>
            </select>

            <label style={{ color: 'var(--muted)', fontSize: '13px' }}>Ano finalizado:</label>
            <select value={shelfYearFilter} onChange={(e) => setShelfYearFilter(e.target.value)} style={{ width: '170px' }}>
              <option value="todos">Todos os anos</option>
              {availableCompletionYears.map((year) => (
                <option key={year} value={String(year)}>{year}</option>
              ))}
            </select>
          </div>
  <div 
    className="netflix-row" 
    style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
      gap: '20px',
      overflowX: 'visible',
      width: '100%'
    }}
  >
            {(() => {
              const filtered = books.filter((book) => {
                const statusMatch = shelfFilter === 'todos' ? true : book.status === shelfFilter;
                const yearMatch = shelfYearFilter === 'todos' ? true : (() => {
                  const rawDate = book.end_date || book.endDate;
                  if (!rawDate || book.status !== 'lido') return false;
                  const parsedYear = new Date(rawDate + (rawDate.includes('T') ? '' : 'T12:00:00')).getFullYear();
                  return String(parsedYear) === String(shelfYearFilter);
                })();
                return statusMatch && yearMatch;
              });
              return filtered.length > 0 ? filtered.map(Card) : <p className="empty-text">Nenhum livro encontrado para esse filtro.</p>;
            })()}
  </div>
</section>

          <footer className="magic-footer"><p>✦ Livros são feitiços disfarçados de palavras. ✦</p></footer>
        </>
      );
    }

    if (page === "registro_leituras") {
      const lendoAgora = byStatus("lendo");
      const livroAtual = lendoAgora.length > 0 ? lendoAgora[currentReadingIndex] : null;
      const logsDoMes = readingLogs.filter(log => {
        const logDate = new Date(log.logged_at);
        return logDate.getMonth() === currentCalendarDate.getMonth() && logDate.getFullYear() === currentCalendarDate.getFullYear();
      });

      const paginasLidasNoMes = logsDoMes.reduce((acc, log) => acc + log.pages_read, 0);
      const diasUnicos = new Set(logsDoMes.map(log => new Date(log.logged_at).toDateString()));
      const totalDiasLidos = diasUnicos.size;
      const mediaPorDia = totalDiasLidos > 0 ? Math.round(paginasLidasNoMes / totalDiasLidos) : 0;

      const ano = currentCalendarDate.getFullYear();
      const mes = currentCalendarDate.getMonth();
      const nomeMeses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
      const primeiroDiaDoMes = new Date(ano, mes, 1).getDay();
      const totalDiasNoMes = new Date(ano, mes + 1, 0).getDate();
      
      const diasCalendario = [];
      for (let i = 0; i < primeiroDiaDoMes; i++) diasCalendario.push(null);
      for (let d = 1; d <= totalDiasNoMes; d++) diasCalendario.push(new Date(ano, mes, d));

      return (
        <div className="registro-leituras-page">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h2 style={{ fontFamily: 'Cinzel, serif', color: 'var(--gold)' }}>Registro de Leituras ✦</h2>
              <p style={{ color: 'var(--muted)', fontSize: '14px' }}>Acompanhe cada página da sua jornada.</p>
            </div>
            <button onClick={() => { setOpenLogModal(true); setQuickLogMsg(""); }} className="btn-add-magic">+ Registrar leitura</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '20px', marginBottom: '20px' }}>
            <div className="card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', alignItems: 'center' }}>
                <button onClick={() => setCurrentCalendarDate(new Date(ano, mes - 1, 1))} style={{ background: 'none', border: 'none', color: 'var(--gold)', cursor: 'pointer' }}>◀</button>
                <h3 style={{ fontFamily: 'Cinzel, serif', margin: 0 }}>{nomeMeses[mes]} de {ano}</h3>
                <button onClick={() => setCurrentCalendarDate(new Date(ano, mes + 1, 1))} style={{ background: 'none', border: 'none', color: 'var(--gold)', cursor: 'pointer' }}>▶</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', fontWeight: 'bold', fontSize: '12px', color: 'var(--gold-soft)', marginBottom: '10px' }}>
                <span>Dom</span><span>Seg</span><span>Ter</span><span>Qua</span><span>Qui</span><span>Sex</span><span>Sáb</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', rowGap: '12px', textAlign: 'center' }}>
                {diasCalendario.map((dataDia, index) => {
                  if (!dataDia) return <div key={index}></div>;
                  const leuNesseDia = readingLogs.some(log => new Date(log.logged_at).toDateString() === dataDia.toDateString());
                  return (
                    <div key={index} style={{ position: 'relative', padding: '5px 0', fontSize: '14px' }}>
                      <span>{dataDia.getDate()}</span>
                      {leuNesseDia && <span style={{ position: 'absolute', bottom: '1px', left: '50%', transform: 'translateX(-50%)', width: '5px', height: '5px', backgroundColor: '#ffd36e', borderRadius: '50%' }}></span>}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center', gap: '15px' }}>
              <div><p style={{ fontSize: '12px', color: 'var(--muted)', margin: 0 }}>DIAS LIDOS</p><h2 style={{ fontFamily: 'Cinzel, serif', color: '#62ffb0', margin: '5px 0' }}>{totalDiasLidos} <span style={{ fontSize: '14px' }}>dias</span></h2></div>
              <div style={{ borderTop: '1px solid rgba(214,180,125,0.1)', borderBottom: '1px solid rgba(214,180,125,0.1)', padding: '10px 0' }}><p style={{ fontSize: '12px', color: 'var(--muted)', margin: 0 }}>PÁGINAS LIDAS</p><h2 style={{ fontFamily: 'Cinzel, serif', color: 'var(--gold)', margin: '5px 0' }}>{paginasLidasNoMes.toLocaleString()} <span style={{ fontSize: '14px' }}>páginas</span></h2></div>
              <div><p style={{ fontSize: '12px', color: 'var(--muted)', margin: 0 }}>MÉDIA POR DIA</p><h2 style={{ fontFamily: 'Cinzel, serif', color: '#8c62ff', margin: '5px 0' }}>{mediaPorDia} <span style={{ fontSize: '14px' }}>páginas</span></h2></div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 0.7fr', gap: '20px' }}>
            <div className="card" style={{ padding: '20px' }}>
              <h3 style={{ fontFamily: 'Cinzel, serif', marginBottom: '15px' }}>Histórico de Leituras ✍️</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(214,180,125,0.2)', color: 'var(--gold-soft)' }}>
                      <th style={{ padding: '10px 5px' }}>DATA</th>
                      <th style={{ padding: '10px 5px' }}>LIVRO</th>
                      <th style={{ padding: '10px 5px' }}>PÁGINAS LIDAS</th>
                      <th style={{ padding: '10px 5px', width: '60px', textAlign: 'center' }}>AÇÕES</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logsDoMes.length > 0 ? (
                      logsDoMes.map((log) => {
                        const livroRelacionado = books.find(b => b.id === log.book_id);
                        return (
                            <tr key={log.id} style={{ borderBottom: '1px solid rgba(214,180,125,0.05)' }}>
                              <td style={{ padding: '10px 5px', color: 'var(--muted)' }}>{new Date(log.logged_at).toLocaleDateString('pt-BR')}</td>
                              <td style={{ padding: '10px 5px', fontWeight: 'bold' }}>{livroRelacionado ? livroRelacionado.title : "Livro Desconhecido"}</td>
                              <td style={{ padding: '10px 5px', color: '#62ffb0' }}>+{log.pages_read} pág.</td>
                              <td style={{ padding: '10px 5px', textAlign: 'center' }}>
                                <button onClick={() => deleteLog(log.id)} style={{ background: 'none', border: 'none', color: '#ff6b6b', cursor: 'pointer', fontSize: '14px' }} title="Excluir registro">✕</button>
                              </td>
                            </tr>
                          );
                      })
                    ) : (
                      <tr><td colSpan="3" style={{ padding: '20px 0', textAlign: 'center', color: 'var(--muted)' }}>Nenhum registro de leitura lançado este mês.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="card" style={{ padding: '20px' }}>
                <h4 style={{ fontFamily: 'Cinzel, serif', color: 'var(--gold-soft)', marginBottom: '15px' }}>LEITURA ATUAL</h4>
                {byStatus("lendo").length > 0 ? (
                  <div style={{ display: 'flex', alignItems: 'stretch', gap: '12px' }}>
                    {byStatus("lendo").length > 2 && (
                      <button onClick={(e) => { e.stopPropagation(); prevReading(); }} style={{ background: 'none', border: 'none', color: 'var(--gold-soft)', fontSize: '18px', cursor: 'pointer', alignSelf: 'center' }}>◀</button>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px', flex: 1, minWidth: 0 }}>
                      {Array.from({ length: Math.min(2, byStatus("lendo").length) }, (_, offset) => byStatus("lendo")[(currentReadingIndex + offset) % byStatus("lendo").length]).map((book) => {
                        const pct = calculatePercentage(book.current_page, book.pages);

                        return (
                          <div key={book.id} style={{ display: 'flex', gap: '15px', alignItems: 'center', minWidth: 0 }} onClick={() => handleCardClick(book)}>
                            <img src={book.cover || "https://via.placeholder.com/70x105"} alt="Capa" style={{ width: '70px', height: '105px', objectFit: 'cover', borderRadius: '6px', border: '1px solid rgba(214,180,125,0.2)' }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <h4 style={{ margin: '0 0 5px 0', fontSize: '15px', color: 'var(--gold-soft)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{book.title}</h4>
                              <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)' }}>{book.author}</p>
                              <div className="progress-container" style={{ margin: '10px 0 5px 0', height: '6px' }}><div className="progress-bar" style={{ width: `${pct}%` }}></div></div>
                              <span style={{ fontSize: '11px', color: 'var(--gold-soft)' }}>{pct}% concluído</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {byStatus("lendo").length > 2 && (
                      <button onClick={(e) => { e.stopPropagation(); nextReading(); }} style={{ background: 'none', border: 'none', color: 'var(--gold-soft)', fontSize: '18px', cursor: 'pointer', alignSelf: 'center' }}>▶</button>
                    )}
                  </div>
                ) : <p style={{ color: 'var(--muted)', fontSize: '13px', margin: 0 }}>Nenhum grimório sendo lido ativamente.</p>}
              </div>

              <div className="card" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <h4 style={{ fontFamily: 'Cinzel, serif', color: 'var(--gold-soft)', margin: 0 }}>META DE LEITURA ✨</h4>
                  <input type="number" value={readingGoal} onChange={(e) => setReadingGoal(parseInt(e.target.value) || 0)} style={{ width: '70px', padding: '4px', fontSize: '12px', textAlign: 'center', background: '#1c1228', border: '1px solid rgba(214,180,125,0.3)', color: '#fff' }} />
                </div>
                <p style={{ fontSize: '13px', color: 'var(--muted)', margin: '0 0 10px 0' }}>Ler {readingGoal} páginas este mês</p>
                <div className="progress-container" style={{ height: '8px', marginBottom: '5px' }}><div className="progress-bar" style={{ width: `${Math.min(calculatePercentage(paginasLidasNoMes, readingGoal), 100)}%`, background: 'linear-gradient(90deg, #8c62ff, #62ffb0)' }}></div></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                  <span>{paginasLidasNoMes} / {readingGoal} pág.</span>
                  {paginasLidasNoMes >= readingGoal ? <span style={{ color: '#62ffb0', fontWeight: 'bold' }}>Meta concluída! 🔮</span> : <span style={{ color: 'var(--muted)' }}>{calculatePercentage(paginasLidasNoMes, readingGoal)}%</span>}
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (page === "metas") {
      const todayStats = getStatsByPeriod();
      const now = new Date();
      const booksById = new Map(books.map((book) => [String(book.id), book]));
        const totalBeforeList = beforeThirtyBooks.length;
        const readBeforeCount = beforeThirtyBooks.filter(b => b.read).length;
        const pctReadBefore = totalBeforeList > 0 ? Math.round((readBeforeCount / totalBeforeList) * 100) : 0;
        const pctRemainingBefore = 100 - pctReadBefore;
      const completedBooksFromAcervo = books.filter((book) => {
        if (book.status !== "lido") return false;
        const rawDate = book.end_date || book.endDate;
        if (!rawDate) return false;
        const endDate = new Date(rawDate.includes('T') ? rawDate : rawDate + "T12:00:00");
        return !Number.isNaN(endDate.getTime()) && endDate.getMonth() === now.getMonth() && endDate.getFullYear() === now.getFullYear();
      }).length;
      const completedBooksFromYear = books.filter((book) => {
        if (book.status !== "lido") return false;
        const rawDate = book.end_date || book.endDate;
        if (!rawDate) return false;
        const endDate = new Date(rawDate.includes('T') ? rawDate : rawDate + "T12:00:00");
        return !Number.isNaN(endDate.getTime()) && endDate.getFullYear() === now.getFullYear();
      }).length;
      const booksCompletedThisMonth = completedBooksFromAcervo + beforeThirtyBooks.filter((book) => {
        if (!book.read) return false;
        const dStr = book.read_at || book.readAt || book.readAt || book.readAt;
        if (!dStr) return true; // if no date, assume included
        const d = new Date(dStr + (dStr.includes('T') ? '' : 'T12:00:00'));
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }).length;

      const booksCompletedThisYear = completedBooksFromYear + beforeThirtyBooks.filter((book) => {
        if (!book.read) return false;
        const dStr = book.read_at || book.readAt || book.readAt || book.readAt;
        if (!dStr) return true;
        const d = new Date(dStr + (dStr.includes('T') ? '' : 'T12:00:00'));
        return d.getFullYear() === now.getFullYear();
      }).length;

      const progressPages = Math.min(Math.round((todayStats.dayTotal / (goals.pagesPerDay || 1)) * 100), 100);
      const progressMonth = Math.min(Math.round((booksCompletedThisMonth / (goals.booksPerMonth || 1)) * 100), 100);
      const progressYear = Math.min(Math.round((booksCompletedThisYear / (goals.booksPerYear || 1)) * 100), 100);

      return (
        <div className="wishlist-page" style={{ color: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '25px', borderBottom: '1px solid rgba(214,180,125,0.1)', paddingBottom: '15px' }}>
            <div>
              <h2 style={{ fontFamily: 'Cinzel, serif', color: 'var(--gold)', fontSize: '24px', margin: '0 0 5px 0', letterSpacing: '1px' }}>🎯 METAS</h2>
              <p style={{ color: 'var(--muted)', fontSize: '13px', margin: 0 }}>Acompanhe suas metas de leitura e os livros que quer viver antes dos 30.</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '18px', marginBottom: '24px' }}>
            <div className="card" style={{ padding: '18px', background: 'rgba(28,18,40,0.6)', border: '1px solid rgba(214,180,125,0.12)', borderRadius: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h3 style={{ margin: 0, fontFamily: 'Cinzel, serif', color: 'var(--gold-soft)' }}>📖 Páginas por dia</h3>
                <span style={{ color: '#62ffb0', fontWeight: 'bold' }}>{todayStats.dayTotal}/{goals.pagesPerDay}</span>
              </div>
              <p style={{ color: 'var(--muted)', fontSize: '13px', margin: '0 0 10px 0' }}>Meta diária para manter o ritmo.</p>
              <div className="progress-container" style={{ height: '8px', marginBottom: '8px' }}>
                <div className="progress-bar" style={{ width: `${progressPages}%`, background: 'linear-gradient(90deg, #8c62ff, #62ffb0)' }}></div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--muted)' }}>
                <span>{progressPages}% concluído</span>
                <span>{todayStats.dayTotal} pág. hoje</span>
              </div>
              <div style={{ marginTop: '10px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--gold-soft)', marginBottom: '5px' }}>Meta diária</label>
                <input type="number" min="0" value={goals.pagesPerDay} onChange={(e) => handleGoalChange('pagesPerDay', e.target.value)} style={{ width: '100%', padding: '8px', background: '#130b1e', border: '1px solid rgba(214,180,125,0.2)', color: '#fff', borderRadius: '6px' }} />
              </div>
            </div>

            <div className="card" style={{ padding: '18px', background: 'rgba(28,18,40,0.6)', border: '1px solid rgba(214,180,125,0.12)', borderRadius: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h3 style={{ margin: 0, fontFamily: 'Cinzel, serif', color: 'var(--gold-soft)' }}>📚 Livros por mês</h3>
                <span style={{ color: '#ffd36e', fontWeight: 'bold' }}>{booksCompletedThisMonth}/{goals.booksPerMonth}</span>
              </div>
              <p style={{ color: 'var(--muted)', fontSize: '13px', margin: '0 0 10px 0' }}>Meta para fechar o mês com boa leitura.</p>
              <div className="progress-container" style={{ height: '8px', marginBottom: '8px' }}>
                <div className="progress-bar" style={{ width: `${progressMonth}%`, background: 'linear-gradient(90deg, #ffd36e, #ff9f43)' }}></div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--muted)' }}>
                <span>{progressMonth}% concluído</span>
                <span>{booksCompletedThisMonth} livros</span>
              </div>
              <div style={{ marginTop: '10px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--gold-soft)', marginBottom: '5px' }}>Meta mensal</label>
                <input type="number" min="0" value={goals.booksPerMonth} onChange={(e) => handleGoalChange('booksPerMonth', e.target.value)} style={{ width: '100%', padding: '8px', background: '#130b1e', border: '1px solid rgba(214,180,125,0.2)', color: '#fff', borderRadius: '6px' }} />
              </div>
            </div>

            <div className="card" style={{ padding: '18px', background: 'rgba(28,18,40,0.6)', border: '1px solid rgba(214,180,125,0.12)', borderRadius: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h3 style={{ margin: 0, fontFamily: 'Cinzel, serif', color: 'var(--gold-soft)' }}>✨ Livros por ano</h3>
                <span style={{ color: '#8c62ff', fontWeight: 'bold' }}>{booksCompletedThisYear}/{goals.booksPerYear}</span>
              </div>
              <p style={{ color: 'var(--muted)', fontSize: '13px', margin: '0 0 10px 0' }}>Uma meta mais longa para o seu ciclo literário.</p>
              <div className="progress-container" style={{ height: '8px', marginBottom: '8px' }}>
                <div className="progress-bar" style={{ width: `${progressYear}%`, background: 'linear-gradient(90deg, #8c62ff, #62ffb0)' }}></div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--muted)' }}>
                <span>{progressYear}% concluído</span>
                <span>{booksCompletedThisYear} livros</span>
              </div>
              <div style={{ marginTop: '10px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--gold-soft)', marginBottom: '5px' }}>Meta anual</label>
                <input type="number" min="0" value={goals.booksPerYear} onChange={(e) => handleGoalChange('booksPerYear', e.target.value)} style={{ width: '100%', padding: '8px', background: '#130b1e', border: '1px solid rgba(214,180,125,0.2)', color: '#fff', borderRadius: '6px' }} />
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: '20px', background: 'rgba(20,13,30,0.8)', border: '1px solid rgba(214,180,125,0.14)', borderRadius: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '10px', flexWrap: 'wrap' }}>
              <div>
                <h3 style={{ margin: 0, fontFamily: 'Cinzel, serif', color: 'var(--gold)' }}>30 ANTES DOS 30 ✨</h3>
                <p style={{ color: 'var(--muted)', fontSize: '13px', margin: '4px 0 0 0' }}>Adicione os livros que você quer ler antes de completar 30 anos.</p>
              </div>
              <button onClick={() => { setBeforeThirtyForm({ title: "", author: "", cover: "", read: false }); setOpenBeforeThirtyModal(true); }} style={{ padding: '10px 16px', background: 'linear-gradient(135deg, #8c62ff, #62ffb0)', color: '#0c0814', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>+ Adicionar</button>
            </div>

            <div style={{ display: 'grid', gap: '10px' }}>
                <div style={{ marginBottom: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontSize: '12px', color: 'var(--muted)' }}>Lidos</p>
                      <h3 style={{ margin: '6px 0 0 0', color: '#62ffb0', fontFamily: 'Cinzel, serif' }}>{readBeforeCount}/{totalBeforeList} ({pctReadBefore}%)</h3>
                    </div>
                    <div style={{ flex: 1, textAlign: 'right' }}>
                      <p style={{ margin: 0, fontSize: '12px', color: 'var(--muted)' }}>Faltam</p>
                      <h3 style={{ margin: '6px 0 0 0', color: '#ffd36e', fontFamily: 'Cinzel, serif' }}>{totalBeforeList - readBeforeCount}/{totalBeforeList} ({pctRemainingBefore}%)</h3>
                    </div>
                  </div>
                  <div className="progress-container" style={{ height: '8px', marginTop: '10px' }}>
                    <div className="progress-bar" style={{ width: `${pctReadBefore}%`, background: 'linear-gradient(90deg, #62ffb0, #8c62ff)' }}></div>
                  </div>
                </div>
                {beforeThirtyBooks.length > 0 ? beforeThirtyBooks.map((book, index) => (
                <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(214,180,125,0.08)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                    {book.cover ? <img src={book.cover} alt={book.title} style={{ width: '44px', height: '64px', objectFit: 'cover', borderRadius: '6px', border: '1px solid rgba(214,180,125,0.15)' }} /> : <div style={{ width: '44px', height: '64px', borderRadius: '6px', background: 'rgba(214,180,125,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}>📖</div>}
                    <div style={{ flex: 1 }}>
                      <div style={{ color: 'var(--gold-soft)', fontWeight: 'bold' }}>{book.title}</div>
                      {book.author && <div style={{ color: 'var(--muted)', fontSize: '12px' }}>{book.author}</div>}
                      <div style={{ color: book.read ? '#62ffb0' : 'var(--muted)', fontSize: '11px', marginTop: '4px' }}>{book.read ? '✓ Já li' : '○ Ainda quero ler'}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button onClick={() => toggleBeforeThirtyRead(index)} style={{ background: book.read ? 'rgba(98,255,176,0.15)' : 'rgba(214,180,125,0.08)', border: '1px solid rgba(214,180,125,0.2)', color: book.read ? '#62ffb0' : 'var(--gold-soft)', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer', fontSize: '11px', whiteSpace: 'nowrap' }}>
                      {book.read ? '✓ Li' : '↺ Não li'}
                    </button>
                    <button onClick={() => removeBeforeThirtyBook(index)} style={{ background: 'none', border: 'none', color: '#ff6b6b', cursor: 'pointer', fontSize: '14px' }}>✕</button>
                  </div>
                </div>
              )) : (
                <p style={{ color: 'var(--muted)', margin: 0 }}>Sua lista ainda está em branco. Que tal adicionar o primeiro livro?</p>
              )}
            </div>
          </div>
        </div>
      );
    }

    // =========================================
    // PÁGINA: ÁUDIOS & LIVROS DIGITAIS
    // =========================================
    if (page === "digital") {
      return (
        <div className="wishlist-page">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '18px' }}>
            <div>
              <h2 style={{ fontFamily: 'Cinzel, serif', color: 'var(--gold)', margin: 0 }}>🎧 Áudios & Livros Digitais</h2>
              <p style={{ color: 'var(--muted)', margin: 0 }}>Adicione e gerencie suas mídias em áudio e edições digitais.</p>
            </div>
            <button onClick={() => openDigitalModal()} className="btn-add-magic">+ Novo</button>
          </div>

          <div className="digital-gallery">
            {digitalItems.length > 0 ? digitalItems.map((it) => (
              <div key={it.id} className="digital-mini-card" onClick={() => {
                setSelectedDigitalItem(it);
                openDigitalModal(it);
              }}>
                <img src={it.cover || "https://via.placeholder.com/160x220"} alt={it.title} />
                <div className="digital-mini-info">
                  <strong>{it.title}</strong>
                  <span>{it.author}</span>
                  <small>{it.format === 'audio' ? 'Audiobook' : 'E-book'}</small>
                </div>
              </div>
            )) : (
              <div className="card" style={{ gridColumn: '1 / -1', padding: '20px', color: 'var(--muted)' }}>
                Nenhuma mídia digital adicionada ainda.
              </div>
            )}
          </div>

          {digitalModalOpen && (
            <div className="modal-overlay" onClick={closeDigitalModal}>
              <div className="cozy-modal" onClick={(e) => e.stopPropagation()}>
                <button type="button" className="close-preview-x" onClick={closeDigitalModal}>✕</button>
                <h2>{digitalEditingId ? 'Editar mídia' : 'Adicionar mídia'}</h2>

                <form onSubmit={saveDigitalItem} style={{ display: 'grid', gap: '12px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>Título</label>
                      <input value={digitalForm.title} onChange={(e) => setDigitalForm({ ...digitalForm, title: e.target.value })} placeholder="Ex: Duna" required />
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>Autor</label>
                      <input value={digitalForm.author} onChange={(e) => setDigitalForm({ ...digitalForm, author: e.target.value })} placeholder="Ex: Frank Herbert" required />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>Tipo de mídia</label>
                      <select value={digitalForm.format} onChange={(e) => setDigitalForm({ ...digitalForm, format: e.target.value })}>
                        <option value="audio">Audiobook</option>
                        <option value="ebook">E-book</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>Status</label>
                      <button type="button" onClick={() => setDigitalForm({ ...digitalForm, consumed: !digitalForm.consumed })} style={{ width: '100%', background: digitalForm.consumed ? 'rgba(98,255,176,0.12)' : 'rgba(255,255,255,0.04)', border: '1px solid rgba(214,180,125,0.2)', color: digitalForm.consumed ? '#62ffb0' : 'var(--gold-soft)', padding: '12px' }}>
                        {digitalForm.consumed ? '✓ Consumido' : '○ Não consumido'}
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>Data de início</label>
                      <input type="date" value={digitalForm.start_date || ""} onChange={(e) => setDigitalForm({ ...digitalForm, start_date: e.target.value })} />
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>Data de conclusão</label>
                      <input type="date" value={digitalForm.end_date || ""} onChange={(e) => setDigitalForm({ ...digitalForm, end_date: e.target.value })} />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>URL ou upload da capa</label>
                    <input value={digitalForm.cover} onChange={(e) => setDigitalForm({ ...digitalForm, cover: e.target.value })} placeholder="https://..." />
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>Fonte / Link</label>
                    <input value={digitalForm.source} onChange={(e) => setDigitalForm({ ...digitalForm, source: e.target.value })} placeholder="Spotify, Kindle, YouTube, drive..." />
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>Nota</label>
                    <Stars value={digitalForm.rating} onChange={(n) => setDigitalForm({ ...digitalForm, rating: n })} />
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>Notas / observações</label>
                    <textarea value={digitalForm.notes} onChange={(e) => setDigitalForm({ ...digitalForm, notes: e.target.value })} placeholder="Resumo, observações ou motivo da escolha" />
                  </div>

                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '6px' }}>
                    {digitalEditingId && (
                      <button type="button" onClick={() => removeDigitalItem(selectedDigitalItem || { id: digitalEditingId })} style={{ background: '#8b0000', color: '#fff' }}>Excluir</button>
                    )}
                    <button type="button" onClick={closeDigitalModal} style={{ background: 'transparent', border: '1px solid rgba(214,180,125,0.3)', color: 'var(--gold-soft)' }}>Cancelar</button>
                    <button type="submit" className="btn-add-magic">{digitalEditingId ? 'Salvar alterações' : 'Adicionar'}</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      );
    }

    // =========================================
    // PÁGINA: MINHA WISHLIST (DESIGN DA FOTO)
    // =========================================
    if (page === "wishlist") {
      return (
        <div className="wishlist-page" style={{ color: '#fff' }}>
          {wishlistLoading && <p style={{ color: "var(--gold)", textAlign: "center" }}>Alinhando as estrelas da Wishlist...</p>}

          {/* HEADER COM TITULO E ADICIONAR */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '25px', borderBottom: '1px solid rgba(214,180,125,0.1)', paddingBottom: '15px' }}>
            <div>
              <h2 style={{ fontFamily: 'Cinzel, serif', color: 'var(--gold)', fontSize: '24px', margin: '0 0 5px 0', letterSpacing: '1px' }}>✨ MINHA WISHLIST ✨</h2>
              <p style={{ color: 'var(--muted)', fontSize: '13px', margin: 0 }}>Livros que quero ler, ter e guardar com carinho na estante.</p>
            </div>
            <button onClick={() => { resetWishlistForm(); setOpenWishlistModal(true); }} className="btn-add-magic" style={{ background: 'rgba(140,98,255,0.2)', border: '1px solid #8c62ff', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
              + Adicionar livro
            </button>
          </div>

          {/* DASHBOARD DE CONTADORES */}
          <section className="dashboard-counters" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', marginBottom: '25px' }}>
            <div className="counter-card" style={{ background: 'rgba(28,18,40,0.5)', border: '1px solid rgba(214,180,125,0.1)', borderRadius: '12px', padding: '15px', display: 'flex', alignItems: 'center', gap: '15px' }}>
              <span style={{ fontSize: '24px', background: 'rgba(140,98,255,0.1)', padding: '10px', borderRadius: '50%' }}>🛍️</span>
              <div><p style={{ fontSize: '10px', color: 'var(--gold-soft)', margin: 0, letterSpacing: '0.5px' }}>LIVROS NA WISHLIST</p><h3 style={{ margin: '3px 0 0 0', fontFamily: 'Cinzel, serif', fontSize: '20px' }}>{totalWishlistItems} <span style={{ fontSize: '12px', color: 'var(--muted)' }}>livros</span></h3></div>
            </div>
            
            <div className="counter-card" style={{ background: 'rgba(28,18,40,0.5)', border: '1px solid rgba(214,180,125,0.1)', borderRadius: '12px', padding: '15px', display: 'flex', alignItems: 'center', gap: '15px' }}>
              <span style={{ fontSize: '24px', background: 'rgba(255,211,110,0.1)', padding: '10px', borderRadius: '50%' }}>💰</span>
              <div><p style={{ fontSize: '10px', color: 'var(--gold-soft)', margin: 0, letterSpacing: '0.5px' }}>ORÇAMENTO ESTIMADO</p><h3 style={{ margin: '3px 0 0 0', fontFamily: 'Cinzel, serif', fontSize: '20px', color: '#ffd36e' }}>R$ {orcamentoNecessario.toFixed(2)}</h3></div>
            </div>

            <div className="counter-card" style={{ background: 'rgba(28,18,40,0.5)', border: '1px solid rgba(214,180,125,0.1)', borderRadius: '12px', padding: '15px', display: 'flex', alignItems: 'center', gap: '15px' }}>
              <span style={{ fontSize: '24px', background: 'rgba(98,255,176,0.1)', padding: '10px', borderRadius: '50%' }}>✅</span>
              <div><p style={{ fontSize: '10px', color: 'var(--gold-soft)', margin: 0, letterSpacing: '0.5px' }}>JÁ COMPREI</p><h3 style={{ margin: '3px 0 0 0', fontFamily: 'Cinzel, serif', fontSize: '20px', color: '#62ffb0' }}>{totalComprados} <span style={{ fontSize: '12px', color: 'var(--muted)' }}>livros</span></h3></div>
            </div>

            <div className="counter-card" style={{ background: 'rgba(28,18,40,0.5)', border: '1px solid rgba(214,180,125,0.1)', borderRadius: '12px', padding: '15px', display: 'flex', alignItems: 'center', gap: '15px' }}>
              <span style={{ fontSize: '24px', background: 'rgba(255,98,176,0.1)', padding: '10px', borderRadius: '50%' }}>🛒</span>
              <div><p style={{ fontSize: '10px', color: 'var(--gold-soft)', margin: 0, letterSpacing: '0.5px' }}>FALTAM COMPRAR</p><h3 style={{ margin: '3px 0 0 0', fontFamily: 'Cinzel, serif', fontSize: '20px', color: '#ff62b0' }}>{totalFaltam} <span style={{ fontSize: '12px', color: 'var(--muted)' }}>livros</span></h3></div>
            </div>
          </section>

          {/* BARRA DE FILTROS E BUSCA */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: '15px', background: 'rgba(20,13,30,0.6)', padding: '12px 18px', borderRadius: '10px', border: '1px solid rgba(214,180,125,0.05)', marginBottom: '20px', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ fontSize: '11px', color: 'var(--gold-soft)', whiteSpace: 'nowrap' }}>Ordenar por:</label>
              <select value={wishlistSort} onChange={(e) => setWishlistSort(e.target.value)} style={{ padding: '6px 10px', background: '#160e24', border: '1px solid rgba(214,180,125,0.2)', color: '#fff', borderRadius: '6px', fontSize: '13px', width: '100%' }}>
                <option value="prioridade">Prioridade</option>
                <option value="menor_preco">Menor Preço</option>
                <option value="maior_preco">Maior Preço</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ fontSize: '11px', color: 'var(--gold-soft)', whiteSpace: 'nowrap' }}>Filtrar por status:</label>
              <select value={wishlistFilterStatus} onChange={(e) => setWishlistFilterStatus(e.target.value)} style={{ padding: '6px 10px', background: '#160e24', border: '1px solid rgba(214,180,125,0.2)', color: '#fff', borderRadius: '6px', fontSize: '13px', width: '100%' }}>
                <option value="todos">Todos</option>
                <option value="quero">Quero comprar</option>
                <option value="comprado">Já comprei</option>
              </select>
            </div>

            <div style={{ position: 'relative' }}>
              <input 
                type="text" 
                placeholder="Buscar livro ou autor..." 
                value={wishlistSearch}
                onChange={(e) => setWishlistSearch(e.target.value)}
                style={{ width: '100%', padding: '7px 35px 7px 12px', fontSize: '13px', borderRadius: '6px', background: '#160e24', border: '1px solid rgba(214,180,125,0.2)', color: '#fff' }}
              />
              <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', fontSize: '14px' }}>🔍</span>
            </div>
          </div>

          {/* TABELA DE LIVROS DA WISHLIST */}
          <div className="card" style={{ padding: '10px 20px', background: 'rgba(20,13,30,0.3)', border: '1px solid rgba(214,180,125,0.08)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(214,180,125,0.15)', color: 'var(--gold-soft)', fontSize: '11px', letterSpacing: '1px' }}>
                  <th style={{ padding: '15px 10px', width: '35%' }}>LIVRO / AUTOR</th>
                  <th style={{ padding: '15px 10px', width: '15%' }}>PREÇO</th>
                  <th style={{ padding: '15px 10px', width: '15%' }}>PRIORIDADE</th>
                  <th style={{ padding: '15px 10px', width: '15%' }}>COMPRA</th>
                  <th style={{ padding: '15px 10px', width: '15%' }}>STATUS</th>
                  <th style={{ padding: '15px 5px', width: '5%', textAlign: 'center' }}>✦</th>
                </tr>
              </thead>
              <tbody>
                {filteredWishlist.length > 0 ? (
                  filteredWishlist.map((item) => {
                    // Cor da tag de prioridade
                    const priorityColor = item.priority === "Alta" ? "#ff62b0" : item.priority === "Média" ? "#ffd36e" : "#4db5ff";
                    
                    return (
                      <tr key={item.id} style={{ borderBottom: '1px solid rgba(214,180,125,0.04)', transition: 'background 0.2s' }} className="wishlist-row-hover">
                        {/* LIVRO E AUTOR */}
                        <td style={{ padding: '12px 10px' }}>
                          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                            <img src={item.cover || "https://via.placeholder.com/45x65"} alt="Capa" style={{ width: '42px', height: '60px', borderRadius: '4px', objectFit: 'cover', border: '1px solid rgba(214,180,125,0.15)' }} />
                            <div>
                              <h4 style={{ margin: '0 0 3px 0', fontSize: '14px', fontWeight: '600', color: '#fff' }}>{item.title}</h4>
                              <p style={{ margin: 0, fontSize: '12px', color: 'var(--muted)' }}>{item.author}</p>
                            </div>
                          </div>
                        </td>

                        {/* PREÇO */}
                        <td style={{ padding: '12px 10px', fontWeight: 'bold', color: 'var(--gold-soft)' }}>
                          R$ {parseFloat(item.price || 0).toFixed(2)}
                        </td>

                        {/* PRIORIDADE */}
                        <td style={{ padding: '12px 10px' }}>
                          <span style={{ display: 'inline-block', padding: '4px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', backgroundColor: 'rgba(255,255,255,0.03)', border: `1px solid ${priorityColor}`, color: priorityColor }}>
                            {item.priority || "Média"}
                          </span>
                        </td>

                        {/* LINK DE COMPRA */}
                        <td style={{ padding: '12px 10px' }}>
                          {item.buy_url ? (
                            <a href={item.buy_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gold)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', background: 'rgba(214,180,125,0.05)', padding: '5px 10px', borderRadius: '5px', border: '1px solid rgba(214,180,125,0.1)' }}>
                              <span>🛒</span> Ver na Loja ↗
                            </a>
                          ) : (
                            <span style={{ color: 'var(--muted)', fontSize: '12px' }}>Não definido</span>
                          )}
                        </td>

                        {/* STATUS */}
                        <td style={{ padding: '12px 10px' }}>
                          <div onClick={() => toggleWishlistStatus(item)} style={{ cursor: 'pointer', display: 'inline-flex', flexDirection: 'column' }}>
                            {item.status === "comprado" ? (
                              <>
                                <span style={{ color: '#62ffb0', fontSize: '12px', fontWeight: 'bold' }}>✅ Já comprei</span>
                                {item.bought_at && <span style={{ fontSize: '10px', color: 'var(--muted)' }}>{new Date(item.bought_at+"T12:00:00").toLocaleDateString('pt-BR')}</span>}
                              </>
                            ) : (
                              <span style={{ color: 'var(--muted)', fontSize: '12px' }}>⚪ Quero comprar</span>
                            )}
                          </div>
                        </td>

                        {/* AÇÕES DE EDITAR/EXCLUIR */}
                        <td style={{ padding: '12px 5px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                            <button onClick={() => handleEditWishlist(item)} style={{ background: 'none', border: 'none', color: 'var(--gold)', cursor: 'pointer', fontSize: '13px' }} title="Editar">✍️</button>
                            <button onClick={() => deleteWishlistItem(item.id)} style={{ background: 'none', border: 'none', color: '#ff6b6b', cursor: 'pointer', fontSize: '13px' }} title="Excluir">✕</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="6" style={{ padding: '30px 0', textAlign: 'center', color: 'var(--muted)' }}>
                      Nenhum livro encontrado na sua Wishlist. ✨
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      );
    }
    return <section className="books shelf-section"><h2>🎯 Em breve</h2></section>;
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <h2>🌙 Arcana</h2>
        <div className="user-badge-profile">✨ {user.email.split('@')[0]}</div>
        <button onClick={() => setPage("leituras")} style={{ fontWeight: page === "leituras" ? "bold" : "normal" }}>📚 Painel Geral</button>
        <button onClick={() => setPage("registro_leituras")} style={{ fontWeight: page === "registro_leituras" ? "bold" : "normal" }}>✨ Registro de Leituras</button>
        <button onClick={() => setPage("wishlist")} style={{ fontWeight: page === "wishlist" ? "bold" : "normal" }}>⭐ Wishlist</button>
        <button onClick={() => setPage("metas")} style={{ fontWeight: page === "metas" ? "bold" : "normal" }}>🎯 Metas</button>
        <button onClick={() => setPage("digital")} style={{ fontWeight: page === "digital" ? "bold" : "normal" }}>🎧 Áudios & Digitais</button>
        
        <button onClick={() => { setOpenPasswordModal(true); setPasswordStatusMsg(""); }} className="btn-change-pass-sidebar" style={{ marginTop: 'auto', background: 'rgba(214,180,125,0.05)', border: '1px dashed rgba(214,180,125,0.2)' }}>🔑 Alterar Senha</button>
        <button onClick={handleLogout} className="btn-logout-sidebar" style={{ background: '#321d22', marginTop: '10px' }}>🚪 Fechar Círculo (Sair)</button>
      </aside>

      <main className="main">
        <header className="header"><h1>Arcana</h1><p>Biblioteca mística pessoal sincronizada em nuvem</p></header>
        {renderPage()}
      </main>

      {/* POP-UP ALTERAR SENHA */}
      {openPasswordModal && (
        <div className="modal-overlay" onClick={() => setOpenPasswordModal(false)}>
          <div className="modal cozy-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '350px' }}>
            <h2>🔮 Nova Palavra-Passe</h2>
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

      {/* POP-UP DE REGISTRO RÁPIDO DE LEITURA */}
      {openLogModal && (
        <div className="modal-overlay" onClick={() => setOpenLogModal(false)}>
          <div className="modal cozy-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <h2>✍️ Registrar Páginas Lidas</h2>
            <form onSubmit={handleSaveQuickLog} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--gold-soft)', display: 'block', marginBottom: '5px' }}>Selecione o Livro:</label>
                <select value={logForm.book_id} onChange={(e) => setLogForm({ ...logForm, book_id: e.target.value })} style={{ width: '100%', padding: '10px', background: '#1c1228', color: '#fff', border: '1px solid rgba(214,180,125,0.3)' }} required>
                  <option value="">-- Escolha um livro --</option>
                  {books.filter(b => b.status === "lendo").map(b => <option key={b.id} value={b.id}>{b.title} (pág. atual: {b.current_page})</option>)}
                  {books.filter(b => b.status !== "lendo").map(b => <option key={b.id} value={b.id}>{b.title} ({b.status})</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--gold-soft)', display: 'block', marginBottom: '5px' }}>Quantas páginas você leu?</label>
                <input type="number" placeholder="Ex: 25" value={logForm.pages_read} onChange={(e) => setLogForm({ ...logForm, pages_read: e.target.value })} required />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--gold-soft)', display: 'block', marginBottom: '5px' }}>Data da Leitura:</label>
                <input type="date" value={logForm.logged_at} onChange={(e) => setLogForm({ ...logForm, logged_at: e.target.value })} required />
              </div>
              {quickLogMsg && <p style={{ fontSize: '13px', color: quickLogMsg.includes('integradas') ? '#62ffb0' : '#ff6b6b', textAlign: 'center', margin: 0 }}>{quickLogMsg}</p>}
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="submit" style={{ flex: 1, background: 'linear-gradient(135deg, #8c62ff, #62ffb0)', color: '#0c0814', fontWeight: 'bold' }}>Salvar Registro</button>
                <button type="button" onClick={() => setOpenLogModal(false)} style={{ background: '#444' }}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POP-UP DETALHES + ATUALIZADOR INTERNO */}
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
                {selectedBook.status === "lendo" && (
                  <div style={{ marginTop: '20px', background: 'rgba(214,180,125,0.04)', padding: '15px', borderRadius: '14px', border: '1px dashed rgba(214,180,125,0.2)' }}>
                    <h5 style={{ margin: '0 0 10px 0', color: 'var(--gold)', fontSize: '12px' }}>📈 REGISTRAR DIÁRIO</h5>
                    <form onSubmit={handleUpdateProgress} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Pág. Atual:</span>
                        <input type="number" placeholder={selectedBook.current_page} value={inputPageUpdate} onChange={(e) => setInputPageUpdate(e.target.value)} style={{ padding: '6px', fontSize: '13px', flex: 1, textAlign: 'center' }} />
                      </div>
                      <button type="submit" style={{ padding: '8px', fontSize: '12px', background: 'linear-gradient(135deg, #8c62ff, #62ffb0)', color: '#0c0814', fontWeight: 'bold' }}>Salvar Páginas</button>
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
                <p className="preview-detail-text"><strong>Progresso Real:</strong> {calculatePercentage(selectedBook.current_page, selectedBook.pages)}% concluído ({selectedBook.current_page} de {selectedBook.pages || "?"} pág.)</p>
                {selectedBook.publisher && <p className="preview-detail-text"><strong>Editora:</strong> {selectedBook.publisher}</p>}
                <div className="preview-summary-box"><h4>Resumo da Obra</h4><p>{selectedBook.summary || "Nenhum resumo místico inserido..."}</p></div>
                <div className="preview-footer-actions">
                  <button onClick={handleEditFromPreview} className="btn-edit-magic">✍️ Editar</button>
                  <button onClick={() => toggleFavorite(selectedBook.id)} className="btn-action">{selectedBook.favorite ? "❤️ Favorito" : "🤍 Favoritar"}</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL FORMULÁRIO (LIVROS PRINCIPAIS) */}
      {openModal && (
        <div className="modal-overlay" onClick={() => { resetForm(); setOpenModal(false); }}>
          <div className="modal cozy-modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editingId ? "✨ Editar Livro" : "✨ Novo Livro"}</h2>
            <input placeholder="Título" value={form.title} onChange={(e)=>setForm({...form,title:e.target.value})}/>
            <input placeholder="Autor" value={form.author} onChange={(e)=>setForm({...form,author:e.target.value})}/>
            <input placeholder="Editora" value={form.publisher} onChange={(e)=>setForm({...form,publisher:e.target.value})}/>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <select value={showNewGenreInput ? '__add_new__' : (form.genre || '')} onChange={(e) => {
                const v = e.target.value;
                if (v === '__add_new__') { setShowNewGenreInput(true); setForm({ ...form, genre: '' }); }
                else { setShowNewGenreInput(false); setForm({ ...form, genre: v }); }
              }} style={{ padding: '8px', background: '#1c1228', color: '#fff', border: '1px solid rgba(214,180,125,0.2)', flex: 1 }}>
                <option value="">-- Selecione um gênero --</option>
                {genres.map((g, i) => <option key={i} value={g}>{g}</option>)}
                <option value="__add_new__">+ Adicionar novo gênero...</option>
              </select>
              {showNewGenreInput && (
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <input placeholder="Novo gênero" value={newGenreValue} onChange={(e) => setNewGenreValue(e.target.value)} style={{ padding: '8px' }} />
                  <button type="button" onClick={() => addGenre()} style={{ padding: '8px', background: 'linear-gradient(135deg, #8c62ff, #62ffb0)', color: '#0c0814', fontWeight: 'bold' }}>Adicionar</button>
                  <button type="button" onClick={() => { setShowNewGenreInput(false); setNewGenreValue(''); }} style={{ padding: '8px', background: '#444' }}>Cancelar</button>
                </div>
              )}
            </div>
            <input placeholder="Total de Páginas" type="number" value={form.pages} onChange={(e)=>setForm({...form,pages:e.target.value})}/>
            <input placeholder="Página Atual inicial" type="number" value={form.current_page} onChange={(e)=>setForm({...form,current_page:parseInt(e.target.value)||0})}/>
            <p>Classificação</p><Stars value={form.rating} onChange={(n)=>setForm({...form,rating:n})}/>
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

      {/* =======================================================
          NOVO: MODAL DA WISHLIST (FIEL À SEGUNDA FOTO DA IMAGEM)
          ======================================================= */}
      {openBeforeThirtyModal && (
        <div className="modal-overlay" onClick={() => { setBeforeThirtyForm({ title: "", author: "", cover: "", read: false }); setOpenBeforeThirtyModal(false); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '620px', padding: '25px', background: '#1c122c', border: '1px solid rgba(214,180,125,0.2)', borderRadius: '14px', position: 'relative' }}>
            <button onClick={() => { setBeforeThirtyForm({ title: "", author: "", cover: "", read: false }); setOpenBeforeThirtyModal(false); }} style={{ position: 'absolute', right: '20px', top: '20px', background: 'none', border: 'none', color: 'var(--gold-soft)', fontSize: '18px', cursor: 'pointer' }}>✕</button>
            <h2 style={{ fontFamily: 'Cinzel, serif', color: 'var(--gold)', margin: '0 0 5px 0', fontSize: '20px' }}>✦ Adicionar novo livro</h2>
            <p style={{ color: 'var(--muted)', fontSize: '12px', marginBottom: '20px' }}>Adicione o livro que você quer ler antes dos 30.</p>

            <form onSubmit={addBeforeThirtyBook} style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <label style={{ fontSize: '12px', color: 'var(--gold-soft)', fontWeight: 'bold' }}>Capa do livro</label>
                <div style={{ width: '100%', height: '240px', border: '2px dashed rgba(214,180,125,0.2)', borderRadius: '8px', background: beforeThirtyForm.cover ? `url(${beforeThirtyForm.cover}) center/cover no-repeat` : 'rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', position: 'relative', overflow: 'hidden' }}>
                  {!beforeThirtyForm.cover && (
                    <div style={{ textAlign: 'center', padding: '10px', color: 'var(--muted)', fontSize: '11px' }}>
                      <span style={{ fontSize: '24px', display: 'block', marginBottom: '5px' }}>📁</span>
                      Cole a URL da capa aqui
                    </div>
                  )}
                </div>
                <input type="url" placeholder="URL da imagem da capa" value={beforeThirtyForm.cover} onChange={(e) => setBeforeThirtyForm({ ...beforeThirtyForm, cover: e.target.value })} style={{ fontSize: '11px', padding: '6px' }} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--gold-soft)', display: 'block', marginBottom: '4px' }}>Título do livro *</label>
                  <input type="text" placeholder="Ex: A Corte de Névoa e Fúria" value={beforeThirtyForm.title} onChange={(e) => setBeforeThirtyForm({ ...beforeThirtyForm, title: e.target.value })} required />
                </div>

                <div>
                  <label style={{ fontSize: '11px', color: 'var(--gold-soft)', display: 'block', marginBottom: '4px' }}>Autor *</label>
                  <input type="text" placeholder="Ex: Sarah J. Maas" value={beforeThirtyForm.author} onChange={(e) => setBeforeThirtyForm({ ...beforeThirtyForm, author: e.target.value })} required />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 0' }}>
                  <input type="checkbox" checked={beforeThirtyForm.read} onChange={(e) => setBeforeThirtyForm({ ...beforeThirtyForm, read: e.target.checked })} />
                  <label style={{ fontSize: '12px', color: 'var(--gold-soft)' }}>Já li este livro</label>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '5px' }}>
                  <button type="button" onClick={() => { setBeforeThirtyForm({ title: "", author: "", cover: "", read: false }); setOpenBeforeThirtyModal(false); }} style={{ background: 'transparent', border: '1px solid rgba(214,180,125,0.3)', color: 'var(--gold-soft)' }}>✕ Cancelar</button>
                  <button type="submit" style={{ background: 'linear-gradient(135deg, #8c62ff, #62ffb0)', color: '#0c0814', fontWeight: 'bold', padding: '10px 16px' }}>Salvar</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {openWishlistModal && (
        <div className="modal-overlay" onClick={() => { resetWishlistForm(); setOpenWishlistModal(false); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '620px', padding: '25px', background: '#1c122c', border: '1px solid rgba(214,180,125,0.2)', borderRadius: '14px', position: 'relative' }}>
            <button onClick={() => { resetWishlistForm(); setOpenWishlistModal(false); }} style={{ position: 'absolute', right: '20px', top: '20px', background: 'none', border: 'none', color: 'var(--gold-soft)', fontSize: '18px', cursor: 'pointer' }}>✕</button>
            
            <h2 style={{ fontFamily: 'Cinzel, serif', color: 'var(--gold)', margin: '0 0 5px 0', fontSize: '20px' }}>✦ Adicionar novo livro</h2>
            <p style={{ color: 'var(--muted)', fontSize: '12px', marginBottom: '20px' }}>Monte seu próximo desejo de leitura na estante.</p>

            <form onSubmit={saveWishlistItem} style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '20px' }}>
              
              {/* LADO ESQUERDO: UPLOAD DE CAPA */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <label style={{ fontSize: '12px', color: 'var(--gold-soft)', fontWeight: 'bold' }}>Capa do livro</label>
                <div style={{ width: '100%', height: '240px', border: '2px dashed rgba(214,180,125,0.2)', borderRadius: '8px', background: wishlistForm.cover ? `url(${wishlistForm.cover}) center/cover no-repeat` : 'rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', position: 'relative', overflow: 'hidden' }}>
                  {!wishlistForm.cover && (
                    <div style={{ textAlign: 'center', padding: '10px', color: 'var(--muted)', fontSize: '11px' }}>
                      <span style={{ fontSize: '24px', display: 'block', marginBottom: '5px' }}>📁</span>
                      Clique para enviar<br/>ou arraste aqui<br/><span style={{ fontSize: '9px' }}>PNG, JPG até 5MB</span>
                    </div>
                  )}
                  <input type="file" onChange={handleWishlistFile} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} />
                </div>
                <input 
                  type="text" 
                  placeholder="Ou cole a URL da imagem da capa" 
                  value={wishlistForm.cover} 
                  onChange={(e) => setWishlistForm({ ...wishlistForm, cover: e.target.value })}
                  style={{ fontSize: '11px', padding: '6px' }}
                />
              </div>

              {/* LADO DIREITO: CAMPOS DO FORMULÁRIO */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--gold-soft)', display: 'block', marginBottom: '4px' }}>Título do livro *</label>
                    <input type="text" placeholder="Ex: A Corte de Névoa e Fúria" value={wishlistForm.title} onChange={(e) => setWishlistForm({ ...wishlistForm, title: e.target.value })} required />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--gold-soft)', display: 'block', marginBottom: '4px' }}>Autor *</label>
                    <input type="text" placeholder="Ex: Sarah J. Maas" value={wishlistForm.author} onChange={(e) => setWishlistForm({ ...wishlistForm, author: e.target.value })} required />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--gold-soft)', display: 'block', marginBottom: '4px' }}>Prioridade de compra</label>
                    <select value={wishlistForm.priority} onChange={(e) => setWishlistForm({ ...wishlistForm, priority: e.target.value })} style={{ width: '100%', padding: '9px', background: '#130b1e', color: '#fff', border: '1px solid rgba(214,180,125,0.2)' }}>
                      <option value="Baixa">⭐ Baixa</option>
                      <option value="Média">⭐ Média</option>
                      <option value="Alta">🔥 Alta</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--gold-soft)', display: 'block', marginBottom: '4px' }}>Preço Estimado (R$)</label>
                    <input type="number" step="0.01" placeholder="Ex: 59.90" value={wishlistForm.price} onChange={(e) => setWishlistForm({ ...wishlistForm, price: e.target.value })} />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '11px', color: 'var(--gold-soft)', display: 'block', marginBottom: '4px' }}>Link para compra (URL)</label>
                  <input type="url" placeholder="🔗 Cole o link do site (Amazon, Submarino, etc.)" value={wishlistForm.buy_url} onChange={(e) => setWishlistForm({ ...wishlistForm, buy_url: e.target.value })} />
                </div>

                <div>
                  <label style={{ fontSize: '11px', color: 'var(--gold-soft)', display: 'block', marginBottom: '4px' }}>Status</label>
                  <select value={wishlistForm.status} onChange={(e) => setWishlistForm({ ...wishlistForm, status: e.target.value })} style={{ width: '100%', padding: '9px', background: '#130b1e', color: '#fff', border: '1px solid rgba(214,180,125,0.2)' }}>
                    <option value="quero">Quero comprar</option>
                    <option value="comprado">Já comprei</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '11px', color: 'var(--gold-soft)', display: 'block', marginBottom: '4px' }}>Observações (opcional)</label>
                  <textarea placeholder="Adicione uma observação sobre o livro..." value={wishlistForm.notes} onChange={(e) => setWishlistForm({ ...wishlistForm, notes: e.target.value })} style={{ height: '70px' }}></textarea>
                </div>

                {/* BOTÕES DE SUBMIT */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '5px' }}>
                  <button type="button" onClick={() => { resetWishlistForm(); setOpenWishlistModal(false); }} style={{ background: 'transparent', border: '1px solid rgba(214,180,125,0.3)', color: 'var(--gold-soft)' }}>
                    ✕ Cancelar
                  </button>
                  <button type="submit" style={{ background: '#8c62ff', color: '#fff', fontWeight: 'bold', padding: '10px 20px' }}>
                    📥 {editingWishlistId ? "Atualizar item" : "Adicionar livro"}
                  </button>
                </div>

              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;