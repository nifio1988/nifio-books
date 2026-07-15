let books = [];

const grid = document.getElementById("grid");
const search = document.getElementById("search");
const overlay = document.getElementById("overlay");
const categoriesDiv = document.getElementById("categories");

fetch("books.json")
  .then(r => r.json())
  .then(data => {
    books = data;
    render(books);
    buildCategories(); 
  });

search.addEventListener("input", applyFilters);

function render(list) {
  grid.innerHTML = "";

  list.forEach(b => {
    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
      <img src="${b.cover}">
      <h3>${b.title}</h3>
      <small>${b.category}</small>
    `;

    grid.appendChild(card);
  });
}

function buildCategories() {
  const cats = ["Tutti", ...new Set(books.map(b => b.category))];

  categoriesDiv.innerHTML = "";

  cats.forEach(cat => {
    const btn = document.createElement("button");
    btn.className = "cat-btn";
    btn.innerText = cat;

    if (cat === activeCategory) btn.classList.add("active");

    btn.onclick = () => {
      activeCategory = cat;
      applyFilters();
      buildCategories();
    };

    categoriesDiv.appendChild(btn);
  });
}

function applyFilters() {
  const v = search.value.toLowerCase();

  let filtered = books;

  if (activeCategory !== "Tutti") {
    filtered = filtered.filter(b => b.category === activeCategory);
  }

  if (v) {
    filtered = filtered.filter(b =>
      b.title.toLowerCase().includes(v) ||
      b.category.toLowerCase().includes(v)
    );
  }

  render(filtered);
}
