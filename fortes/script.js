/**************************************************************PONTOS.HTML**************************************************************/

document.addEventListener('DOMContentLoaded', function() {
            const mapaDiv = document.getElementById('mapa');
            const listaPontos = document.getElementById('lista-de-pontos');
            const mensagemErroDiv = document.getElementById('mensagem-erro');

            function buscarPontosProximos(latitude, longitude) {
                fetch(`/api/pontos-proximos?lat=${latitude}&lon=${longitude}`)
                    .then(response => {
                        if (!response.ok) {
                            throw new Error(`Erro na requisição: ${response.status}`);
                        }
                        return response.json();
                    })
                    .then(data => {
                        exibirPontos(data);
                    })
                    .catch(error => {
                        console.error("Erro ao buscar pontos:", error);
                        mensagemErroDiv.textContent = "Erro ao carregar os pontos de coleta.";
                        mensagemErroDiv.style.display = 'block';
                        listaPontos.textContent = ''; // Limpa a mensagem de carregamento
                        mapaDiv.textContent = 'Erro ao carregar o mapa.'; // Limpa a mensagem de carregamento do mapa
                    });
            }

            function exibirPontos(pontos) {
                listaPontos.innerHTML = ''; // Limpa a lista anterior
                if (pontos && pontos.length > 0) {
                    pontos.forEach(ponto => {
                        const li = document.createElement('li');
                        li.textContent = `${ponto.nome} - ${ponto.endereco} (${ponto.tipos_residuos})`;
                        listaPontos.appendChild(li);
                        // Se estiver usando um mapa, adicione marcadores aqui usando as coordenadas do ponto
                        // Exemplo (requer integração com uma biblioteca de mapas):
                        // adicionarMarcadorNoMapa(ponto.latitude, ponto.longitude, ponto.nome);
                    });
                    mapaDiv.textContent = 'Mapa carregado.'; // Indica que o mapa está pronto (ou foi inicializado)
                } else {
                    listaPontos.textContent = 'Nenhum ponto de coleta encontrado próximo a você.';
                    mapaDiv.textContent = 'Nenhum ponto de coleta encontrado.';
                }
            }

            // Supondo que a localização do usuário esteja disponível globalmente (definida em outro script, por exemplo)
            if (typeof userLatitude !== 'undefined' && typeof userLongitude !== 'undefined') {
                buscarPontosProximos(userLatitude, userLongitude);
            } else {
                // Lógica para obter a localização usando a API de Geolocalização do navegador
                if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(function(position) {
                        buscarPontosProximos(position.coords.latitude, position.coords.longitude);
                        // Se precisar usar a localização no mapa imediatamente, inicialize-o aqui
                        // inicializarMapa(position.coords.latitude, position.coords.longitude);
                    }, function(error) {
                        console.error("Erro ao obter localização:", error);
                        mensagemErroDiv.textContent = "Não foi possível obter sua localização.";
                        mensagemErroDiv.style.display = 'block';
                        listaPontos.textContent = ''; // Limpa a mensagem de carregamento
                        mapaDiv.textContent = 'Não foi possível obter sua localização para exibir o mapa.';
                    });
                } else {
                    console.log("Geolocalização não suportada pelo navegador.");
                    mensagemErroDiv.textContent = "Geolocalização não suportada pelo seu navegador.";
                    mensagemErroDiv.style.display = 'block';
                    listaPontos.textContent = ''; // Limpa a mensagem de carregamento
                    mapaDiv.textContent = 'Geolocalização não suportada.';
                }
            }
        });

        // Função simulada para adicionar um marcador no mapa (você precisará usar uma biblioteca de mapas real)
        function adicionarMarcadorNoMapa(lat, lon, nome) {
            console.log(`Adicionando marcador para ${nome} em ${lat}, ${lon}`);
            const mapaDiv = document.getElementById('mapa');
            mapaDiv.textContent += `\nMarcador: ${nome}`; // Simulação visual
        }

        // Função simulada para inicializar o mapa (você precisará usar uma biblioteca de mapas real)
        function inicializarMapa(lat, lon) {
            console.log(`Inicializando mapa em ${lat}, ${lon}`);
            const mapaDiv = document.getElementById('mapa');
            mapaDiv.textContent = `Mapa centralizado em ${lat}, ${lon}.`; // Simulação visual
        }
        
/**************************************************************PONTOS.HTML**************************************************************/