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

    showPokemonCard(pokemonName); //isim kısmı boşsa burası çalışmıyor bloktan çıktık
}) //kullanıcı gerçekten vir şey yazdıysa bu kart çalışacak 

function showPokemonCard(name) { //Bu fonksiyon bir Pokémon adı bekliyor.
    result.innerHTML = `
        <div class="pokemon-card">
            <h2>${name}</h2>

            <p>Type: Electric</p>
            <p>HP: 35</p>
            <p>Attack: 55</p>

            <button id="addTeamBtn"> 
                Takıma Ekle
            </button>
        </div>
    `;

    const addTeamBtn = document.querySelector("#addTeamBtn");
    addTeamBtn.addEventListener("click",function(){
        addPokemonToName(name);
    })
}
function addPokemonToTeam(name) {
    team.innerHTML += `
        <div class="team-pokemon">
            <span>${name}</span>
            <button class="removeBtn">Çıkar</button>
        </div>
    `;
}