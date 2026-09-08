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
function addPokemonToTeam(pokemon) {
    const pokemonDiv = document.createElement("div"); //js ile yeni bir div oluşturulur

    pokemonDiv.classList.add("team-pokemon"); //bu div’e class veriyoruz.

    pokemonDiv.innerHTML = `
        <span>${pokemon.displayName}</span>
        <button class="removeBtn">Çıkar</button>
    `;

    const removeBtn = pokemonDiv.querySelector(".removeBtn");

    removeBtn.addEventListener("click", function () {
        pokemonDiv.remove();
    });

    team.appendChild(pokemonDiv);
}