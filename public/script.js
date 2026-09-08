const pokemonInput = document.querySelector("#pokemonInput");
const searchBtn = document.querySelector("#searchBtn"); //buton
const result = document.querySelector("#result");
const team = document.querySelector("#team");

searchBtn.addEventListener("click", async function(){
    const pokemonName = pokemonInput.value.trim().toLowerCase(); //.value inputta yazanı alır
// trim, baştaki/sondaki gereksiz boşlukları temizler.
    if (pokemonName === ""){ //Pokemon adı boş mu? kontrolü yapılrı
        result.innerHTML = "Bir Pokemon adı gir";
        return;
    }
    const response = await fetch(`/api/pokemon/${pokemonName}`); //Burada frontend kendi server’ına HTTP isteği gönderiyor.fetch() bu adrese bir GET isteği yollar.
        if (!response.ok) { //boolean,HTTP isteğinin başarılı olup olmadığını söyler.
        result.innerHTML = "Pokémon bulunamadı.";
        return;
    }

    const pokemon = await response.json(); //Server aslında bize JSON gönderiyor.

    showPokemonCard(pokemon); //server’dan gelen bütün Pokémon objesini başka bir fonksiyona gönderiyoruz.
});
//isim kısmı boşsa burası çalışmıyor bloktan çıktık
 //kullanıcı gerçekten vir şey yazdıysa bu kart çalışacak 
function showPokemonCard(pokemon) { //Gelen Pokémon verisini HTML kartına çevirmek.
    result.innerHTML = `
        <div class="pokemon-card">

            <img src="${pokemon.image}" alt="${pokemon.displayName}">

            <h2>${pokemon.displayName}</h2>

<div class="type-badge">
    ${pokemon.types.join(" • ")}
</div>

<div class="stats-grid">
    <div class="stat">
        <span>HP</span>
        <strong>${pokemon.stats.hp}</strong>
    </div>

    <div class="stat">
        <span>Attack</span>
        <strong>${pokemon.stats.attack}</strong>
    </div>

    <div class="stat">
        <span>Defense</span>
        <strong>${pokemon.stats.defense}</strong>
    </div>

    <div class="stat">
        <span>Speed</span>
        <strong>${pokemon.stats.speed}</strong>
    </div>
</div>

            <button id="addTeamBtn">Takıma Ekle</button>
        </div>
    `;

    const addTeamBtn = document.querySelector("#addTeamBtn"); //takıma ekle butonu

    addTeamBtn.addEventListener("click", function () {
        addPokemonToTeam(pokemon);
    });
}
async function addPokemonToTeam(pokemon) {
    const response = await fetch("/api/team", {
        method: "POST",

        headers: {
            "Content-Type": "application/json"
        },

        body: JSON.stringify({
            name: pokemon.displayName,
            type: pokemon.types.join(", "),
            image: pokemon.image
        })
    });

    if (!response.ok) {
        alert("Pokémon takıma eklenemedi.");
        return;
    }

    loadTeam();
}
async function loadTeam() {
    const response = await fetch("/api/team");

    if (!response.ok) {
        team.innerHTML = "Takım yüklenemedi.";
        return;
    }

    const teamData = await response.json();

    team.innerHTML = "";

    teamData.forEach(function (pokemon) {
        const pokemonDiv = document.createElement("div");

        pokemonDiv.classList.add("team-pokemon");

        pokemonDiv.innerHTML = `
            <img src="${pokemon.image}" alt="${pokemon.name}">
            <div>
                <span>${pokemon.name}</span>
                <p>${pokemon.type}</p>
            </div>

            <button class="removeBtn">
                Çıkar
            </button>
        `;

        const removeBtn = pokemonDiv.querySelector(".removeBtn");

        removeBtn.addEventListener("click", async function () {
            await deletePokemonFromTeam(pokemon.id);
        });

        team.appendChild(pokemonDiv);
    });
}
async function deletePokemonFromTeam(id) {
    const response = await fetch(`/api/team/${id}`, {
        method: "DELETE"
    });

    if (!response.ok) {
        alert("Pokémon takımdan çıkarılamadı.");
        return;
    }

    loadTeam();
}