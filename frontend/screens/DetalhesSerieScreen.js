
import React, { useEffect, useState } from "react";

import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  Linking,
  useWindowDimensions,
} from "react-native";

import YoutubePlayer from "react-native-youtube-iframe";

import {
  buscarSeriePorId,
  buscarDetalhesSerieTMDB,
  buscarTemporadaTMDB,
  buscarTrailerSerieTMDB,
  buscarTrailerTemporadaTMDB,
} from "../services/seriesService";

const obterVideoId = (trailer) => {
  if (!trailer) return null;

  if (trailer.chave) return trailer.chave;

  if (trailer.url) {
    const encontrado = trailer.url.match(
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?/]+)/
    );

    return encontrado ? encontrado[1] : null;
  }

  return null;
};

export default function DetalhesSerieScreen({ navigation, route }) {
  const { width: larguraTela } = useWindowDimensions();

  const larguraCapa = Math.min(larguraTela * 0.62, 300);
  const alturaCapa = larguraCapa * 1.5;

  const larguraVideo = Math.max(0, larguraTela - 40);
  const alturaVideo = larguraVideo * (9 / 16);

  const larguraVideoTemporada = Math.max(0, larguraTela - 84);
  const alturaVideoTemporada = larguraVideoTemporada * (9 / 16);

  const [serie, setSerie] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const [trailerSerie, setTrailerSerie] = useState(null);
  const [carregandoTrailerSerie, setCarregandoTrailerSerie] =
    useState(false);

  const [temporadasAbertas, setTemporadasAbertas] = useState({});
  const [episodiosPorTemporada, setEpisodiosPorTemporada] = useState({});
  const [temporadasCarregando, setTemporadasCarregando] = useState({});
  const [erroTemporadas, setErroTemporadas] = useState({});

  const [trailersPorTemporada, setTrailersPorTemporada] = useState({});
  const [trailersCarregando, setTrailersCarregando] = useState({});

  const id = route.params?.id;
  const origem = route.params?.origem || "mysql";

  // CARREGAR TRAILER GERAL
  const carregarTrailerSerie = async (serieId) => {
    try {
      setCarregandoTrailerSerie(true);

      const trailer = await buscarTrailerSerieTMDB(serieId);

      setTrailerSerie(trailer);
    } catch (error) {
      console.log("Trailer geral não disponível:", error.message);
      setTrailerSerie(null);
    } finally {
      setCarregandoTrailerSerie(false);
    }
  };

  // CARREGAR DETALHES DA SÉRIE
  const carregarSerie = async () => {
    try {
      setCarregando(true);
      setErro("");

      setSerie(null);
      setTrailerSerie(null);
      setCarregandoTrailerSerie(false);

      setTemporadasAbertas({});
      setEpisodiosPorTemporada({});
      setTemporadasCarregando({});
      setErroTemporadas({});

      setTrailersPorTemporada({});
      setTrailersCarregando({});

      if (!id) {
        throw new Error("ID da série não informado.");
      }

      let dados;

      if (origem === "tmdb") {
        dados = await buscarDetalhesSerieTMDB(id);
      } else {
        dados = await buscarSeriePorId(id);
      }

      setSerie(dados);

      if (origem === "tmdb") {
        carregarTrailerSerie(id);
      }
    } catch (error) {
      console.error("Erro ao carregar detalhes da série:", error);
      setErro("Não foi possível carregar os detalhes da série.");
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarSerie();
  }, [id, origem]);

  // CARREGAR TRAILER DA TEMPORADA
  const carregarTrailerTemporada = async (numero) => {
    try {
      setTrailersCarregando((anterior) => ({
        ...anterior,
        [numero]: true,
      }));

      const trailer = await buscarTrailerTemporadaTMDB(id, numero);

      setTrailersPorTemporada((anterior) => ({
        ...anterior,
        [numero]: trailer,
      }));
    } catch (error) {
      console.log(
        `Trailer da temporada ${numero} não disponível:`,
        error.message
      );

      setTrailersPorTemporada((anterior) => ({
        ...anterior,
        [numero]: null,
      }));
    } finally {
      setTrailersCarregando((anterior) => ({
        ...anterior,
        [numero]: false,
      }));
    }
  };

  // CARREGAR EPISÓDIOS
  const carregarEpisodiosTemporada = async (numero) => {
    try {
      setTemporadasCarregando((anterior) => ({
        ...anterior,
        [numero]: true,
      }));

      setErroTemporadas((anterior) => ({
        ...anterior,
        [numero]: "",
      }));

      const dados = await buscarTemporadaTMDB(id, numero);

      setEpisodiosPorTemporada((anterior) => ({
        ...anterior,
        [numero]: dados.episodios || [],
      }));
    } catch (error) {
      console.error(
        `Erro ao carregar episódios da temporada ${numero}:`,
        error
      );

      setErroTemporadas((anterior) => ({
        ...anterior,
        [numero]: "Não foi possível carregar os episódios.",
      }));
    } finally {
      setTemporadasCarregando((anterior) => ({
        ...anterior,
        [numero]: false,
      }));
    }
  };

  // ABRIR OU FECHAR TEMPORADA
  const alternarTemporada = async (temporada) => {
    const numero = temporada.numero;

    if (temporadasAbertas[numero]) {
      setTemporadasAbertas((anterior) => ({
        ...anterior,
        [numero]: false,
      }));

      return;
    }

    setTemporadasAbertas((anterior) => ({
      ...anterior,
      [numero]: true,
    }));

    if (!episodiosPorTemporada[numero]) {
      carregarEpisodiosTemporada(numero);
    }

    if (
      !Object.prototype.hasOwnProperty.call(
        trailersPorTemporada,
        numero
      )
    ) {
      carregarTrailerTemporada(numero);
    }
  };

  // ABRIR PLATAFORMA
  const abrirPlataforma = async (link) => {
    if (!link) return;

    try {
      await Linking.openURL(link);
    } catch (error) {
      console.error("Erro ao abrir plataforma:", error);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <ScrollView
        contentContainerStyle={styles.conteudo}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          style={styles.voltar}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.textoVoltar}>‹ Voltar</Text>
        </TouchableOpacity>

        {carregando ? (
          <ActivityIndicator
            size="large"
            color="#E50914"
            style={styles.carregando}
          />
        ) : erro ? (
          <View style={styles.estado}>
            <Text style={styles.mensagem}>{erro}</Text>

            <TouchableOpacity
              style={styles.botaoTentar}
              onPress={carregarSerie}
            >
              <Text style={styles.textoBotao}>Tentar novamente</Text>
            </TouchableOpacity>
          </View>
        ) : serie ? (
          <>
            {/* CAPA */}
            <View
              style={[
                styles.areaCapa,
                {
                  width: larguraCapa,
                  height: alturaCapa,
                },
              ]}
            >
              {serie.imagem ? (
                <Image
                  source={{ uri: serie.imagem }}
                  style={styles.capa}
                  resizeMode="contain"
                />
              ) : (
                <View style={styles.capaSemImagem}>
                  <Text style={styles.iconeCapa}>▶</Text>
                  <Text style={styles.mensagem}>
                    Imagem não disponível
                  </Text>
                </View>
              )}
            </View>

            {/* INFORMAÇÕES */}
            <Text style={styles.titulo}>{serie.titulo}</Text>

            <View style={styles.informacoes}>
              <Text style={styles.info}>
                {serie.ano || "Ano não informado"}
              </Text>

              <Text style={styles.separador}>•</Text>

              <Text style={styles.info}>Série</Text>
            </View>

            {/* SINOPSE */}
            <Text style={styles.tituloSecao}>Sinopse</Text>

            <Text style={styles.sinopse}>
              {serie.descricao || "Sinopse não disponível."}
            </Text>

            {/* TRAILER GERAL */}
            {origem === "tmdb" && (
              <View style={styles.secaoTrailer}>
                <Text style={styles.tituloSecao}>
                  Trailer da série
                </Text>

                {carregandoTrailerSerie ? (
                  <ActivityIndicator
                    size="small"
                    color="#E50914"
                    style={styles.carregandoTrailer}
                  />
                ) : trailerSerie && obterVideoId(trailerSerie) ? (
                  <View
                    style={[
                      styles.playerContainer,
                      {
                        width: larguraVideo,
                        height: alturaVideo,
                      },
                    ]}
                  >
                    <YoutubePlayer
                      width={larguraVideo}
                      height={alturaVideo}
                      play={false}
                      videoId={obterVideoId(trailerSerie)}
                      webViewStyle={styles.player}
                    />
                  </View>
                ) : (
                  <Text style={styles.mensagem}>
                    Trailer não disponível para esta série.
                  </Text>
                )}

                {trailerSerie?.nome ? (
                  <Text style={styles.nomeTrailer}>
                    {trailerSerie.nome}
                  </Text>
                ) : null}
              </View>
            )}

            {/* TEMPORADAS E EPISÓDIOS */}
            {origem === "tmdb" && (
              <>
                <Text style={styles.tituloSecao}>
                  Temporadas e episódios
                </Text>

                {serie.temporadas?.filter(
                  (temporada) => temporada.numero > 0
                ).length > 0 ? (
                  serie.temporadas
                    .filter((temporada) => temporada.numero > 0)
                    .map((temporada) => {
                      const numero = temporada.numero;
                      const aberta = !!temporadasAbertas[numero];

                      const episodios =
                        episodiosPorTemporada[numero] || [];

                      const trailerTemporada =
                        trailersPorTemporada[numero];

                      return (
                        <View
                          key={temporada.id || numero}
                          style={[
                            styles.blocoTemporada,
                            aberta && styles.blocoTemporadaAberta,
                          ]}
                        >
                          {/* CABEÇALHO DA TEMPORADA */}
                          <TouchableOpacity
                            style={styles.cardTemporada}
                            onPress={() => alternarTemporada(temporada)}
                            activeOpacity={0.8}
                          >
                            <View style={styles.numeroTemporada}>
                              <Text style={styles.numeroTemporadaTexto}>
                                {numero}
                              </Text>
                            </View>

                            <View style={styles.infoTemporada}>
                              <Text style={styles.nomeTemporada}>
                                {temporada.titulo ||
                                  `Temporada ${numero}`}
                              </Text>

                              <Text style={styles.quantidadeEpisodios}>
                                {temporada.quantidade_episodios || 0} episódios
                              </Text>
                            </View>

                            <View style={styles.areaSetaTemporada}>
                              <Text style={styles.setaTemporada}>
                                {aberta ? "−" : "+"}
                              </Text>
                            </View>
                          </TouchableOpacity>

                          {/* CONTEÚDO EXPANDIDO */}
                          {aberta && (
                            <View style={styles.listaEpisodios}>
                              {/* TRAILER DA TEMPORADA */}
                              <View style={styles.trailerTemporada}>
                                <Text style={styles.tituloTrailerTemporada}>
                                  Trailer da temporada
                                </Text>

                                {trailersCarregando[numero] ? (
                                  <ActivityIndicator
                                    size="small"
                                    color="#E50914"
                                    style={styles.carregandoTrailer}
                                  />
                                ) : trailerTemporada &&
                                  obterVideoId(trailerTemporada) ? (
                                  <View
                                    style={[
                                      styles.playerTemporada,
                                      {
                                        width: larguraVideoTemporada,
                                        height: alturaVideoTemporada,
                                      },
                                    ]}
                                  >
                                    <YoutubePlayer
                                      width={larguraVideoTemporada}
                                      height={alturaVideoTemporada}
                                      play={false}
                                      videoId={obterVideoId(
                                        trailerTemporada
                                      )}
                                      webViewStyle={styles.player}
                                    />
                                  </View>
                                ) : (
                                  <Text style={styles.mensagemTrailer}>
                                    Trailer não disponível para esta
                                    temporada.
                                  </Text>
                                )}

                                {trailerTemporada?.nome ? (
                                  <Text style={styles.nomeTrailer}>
                                    {trailerTemporada.nome}
                                  </Text>
                                ) : null}
                              </View>

                              {/* EPISÓDIOS */}
                              <Text style={styles.subtituloEpisodios}>
                                Episódios
                              </Text>

                              {temporadasCarregando[numero] ? (
                                <ActivityIndicator
                                  size="large"
                                  color="#E50914"
                                  style={styles.carregandoEpisodios}
                                />
                              ) : erroTemporadas[numero] ? (
                                <View>
                                  <Text style={styles.mensagem}>
                                    {erroTemporadas[numero]}
                                  </Text>

                                  <TouchableOpacity
                                    onPress={() =>
                                      carregarEpisodiosTemporada(numero)
                                    }
                                  >
                                    <Text style={styles.textoTentarEpisodios}>
                                      Tentar novamente
                                    </Text>
                                  </TouchableOpacity>
                                </View>
                              ) : episodios.length > 0 ? (
                                episodios.map((episodio) => (
                                  <View
                                    key={
                                      episodio.tmdb_id || episodio.numero
                                    }
                                    style={styles.cardEpisodio}
                                  >
                                    {/* IMAGEM HORIZONTAL 16:9 */}
                                    {episodio.imagem ? (
                                      <Image
                                        source={{ uri: episodio.imagem }}
                                        style={styles.imagemEpisodio}
                                        resizeMode="cover"
                                      />
                                    ) : (
                                      <View
                                        style={styles.imagemEpisodioSemImagem}
                                      >
                                        <Text style={styles.iconeEpisodio}>
                                          ▶
                                        </Text>
                                        <Text style={styles.textoSemImagem}>
                                          Imagem indisponível
                                        </Text>
                                      </View>
                                    )}

                                    {/* INFORMAÇÕES */}
                                    <View style={styles.infoEpisodio}>
                                      <Text style={styles.numeroEpisodio}>
                                        EPISÓDIO {episodio.numero}
                                      </Text>

                                      <Text style={styles.nomeEpisodio}>
                                        {episodio.titulo ||
                                          `Episódio ${episodio.numero}`}
                                      </Text>

                                      {episodio.duracao ? (
                                        <Text style={styles.duracaoEpisodio}>
                                          {episodio.duracao} minutos
                                        </Text>
                                      ) : null}

                                      <Text
                                        style={styles.descricaoEpisodio}
                                        numberOfLines={4}
                                      >
                                        {episodio.descricao ||
                                          "Descrição não disponível."}
                                      </Text>
                                    </View>
                                  </View>
                                ))
                              ) : (
                                <Text style={styles.mensagem}>
                                  Nenhum episódio disponível.
                                </Text>
                              )}
                            </View>
                          )}
                        </View>
                      );
                    })
                ) : (
                  <Text style={styles.mensagem}>
                    Nenhuma temporada disponível.
                  </Text>
                )}
              </>
            )}

            {/* ONDE ASSISTIR */}
            <Text style={styles.tituloSecao}>Onde assistir</Text>

            {serie.disponibilidades?.length > 0 ? (
              serie.disponibilidades.map((item, index) => (
                <TouchableOpacity
                  key={`${item.plataforma}-${index}`}
                  style={styles.cardPlataforma}
                  onPress={() => abrirPlataforma(item.link)}
                  disabled={!item.link}
                >
                  <Text style={styles.nomePlataforma}>
                    {item.plataforma}
                  </Text>

                  <Text style={styles.textoPlataforma}>
                    {item.play ? "▶ Assistir" : "Ver disponibilidade"}
                  </Text>
                </TouchableOpacity>
              ))
            ) : (
              <Text style={styles.mensagem}>
                Nenhuma plataforma cadastrada.
              </Text>
            )}
          </>
        ) : null}

        <Text style={styles.rodape}>CineVerse Mobile</Text>
      </ScrollView>
    </View>
  );
}

// ESTILOS
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#090909",
  },

  conteudo: {
    paddingBottom: 50,
  },

  voltar: {
    paddingHorizontal: 20,
    paddingTop: 65,
    paddingBottom: 20,
  },

  textoVoltar: {
    color: "#AAAAAA",
    fontSize: 17,
  },

  // CAPA
  areaCapa: {
    alignSelf: "center",
    backgroundColor: "#151515",
    borderRadius: 14,
    overflow: "hidden",
    marginTop: 5,
    elevation: 8,
  },

  capa: {
    width: "100%",
    height: "100%",
    backgroundColor: "#151515",
  },

  capaSemImagem: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#202024",
  },

  iconeCapa: {
    color: "#E50914",
    fontSize: 55,
  },

  titulo: {
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "900",
    marginHorizontal: 20,
    marginTop: 25,
  },

  informacoes: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    marginTop: 12,
  },

  info: {
    color: "#BBBBBB",
    fontSize: 14,
  },

  separador: {
    color: "#777777",
    marginHorizontal: 10,
  },

  tituloSecao: {
    color: "#FFFFFF",
    fontSize: 21,
    fontWeight: "bold",
    marginHorizontal: 20,
    marginTop: 35,
    marginBottom: 12,
  },

  sinopse: {
    color: "#AAAAAA",
    fontSize: 15,
    lineHeight: 24,
    marginHorizontal: 20,
    marginTop: 4,
  },

  // TRAILERS
  secaoTrailer: {
    marginTop: 5,
  },

  playerContainer: {
    alignSelf: "center",
    marginTop: 8,
    backgroundColor: "#000000",
    borderRadius: 14,
    overflow: "hidden",
  },

  playerTemporada: {
    alignSelf: "center",
    marginTop: 12,
    backgroundColor: "#000000",
    borderRadius: 12,
    overflow: "hidden",
  },

  player: {
    backgroundColor: "#000000",
  },

  carregandoTrailer: {
    marginVertical: 15,
  },

  nomeTrailer: {
    color: "#AAAAAA",
    fontSize: 12,
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 8,
  },

  trailerTemporada: {
    backgroundColor: "#19191F",
    padding: 12,
    marginTop: 4,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#303036",
  },

  tituloTrailerTemporada: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "bold",
    marginHorizontal: 8,
  },

  mensagemTrailer: {
    color: "#999999",
    fontSize: 12,
    marginHorizontal: 8,
    marginTop: 12,
  },

  // TEMPORADAS
  blocoTemporada: {
    marginHorizontal: 20,
    marginTop: 12,
    backgroundColor: "#151519",
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#303036",
  },

  blocoTemporadaAberta: {
    borderColor: "#7D2025",
  },

  cardTemporada: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 17,
    paddingHorizontal: 15,
  },

  numeroTemporada: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#2B171A",
    borderWidth: 1,
    borderColor: "#682329",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 13,
  },

  numeroTemporadaTexto: {
    color: "#E50914",
    fontSize: 19,
    fontWeight: "900",
  },

  infoTemporada: {
    flex: 1,
  },

  nomeTemporada: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },

  quantidadeEpisodios: {
    color: "#999999",
    fontSize: 12,
    marginTop: 5,
  },

  areaSetaTemporada: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#29292F",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 10,
  },

  setaTemporada: {
    color: "#E50914",
    fontSize: 23,
    fontWeight: "bold",
    lineHeight: 27,
  },

  listaEpisodios: {
    paddingHorizontal: 12,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: "#303036",
  },

  // TÍTULO DA LISTA DE EPISÓDIOS
  subtituloEpisodios: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 12,
    marginBottom: 2,
  },

  // EPISÓDIOS
  cardEpisodio: {
    marginTop: 14,
    backgroundColor: "#202027",
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#303036",
  },

  imagemEpisodio: {
    width: "100%",
    aspectRatio: 16 / 9,
    backgroundColor: "#303036",
  },

  imagemEpisodioSemImagem: {
    width: "100%",
    aspectRatio: 16 / 9,
    backgroundColor: "#303036",
    justifyContent: "center",
    alignItems: "center",
  },

  iconeEpisodio: {
    color: "#E50914",
    fontSize: 32,
  },

  textoSemImagem: {
    color: "#999999",
    fontSize: 11,
    marginTop: 5,
  },

  infoEpisodio: {
    padding: 14,
  },

  numeroEpisodio: {
    color: "#E50914",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
    marginBottom: 5,
  },

  nomeEpisodio: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },

  duracaoEpisodio: {
    color: "#BBBBBB",
    fontSize: 12,
    marginTop: 7,
  },

  descricaoEpisodio: {
    color: "#AAAAAA",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 9,
  },

  carregandoEpisodios: {
    margin: 20,
  },

  textoTentarEpisodios: {
    color: "#E50914",
    textAlign: "center",
    padding: 12,
    fontWeight: "bold",
  },

  // PLATAFORMAS
  cardPlataforma: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#1B1B20",
    marginHorizontal: 20,
    marginTop: 12,
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#303036",
  },

  nomePlataforma: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "bold",
  },

  textoPlataforma: {
    color: "#E50914",
    fontWeight: "bold",
  },

  // ESTADOS
  carregando: {
    marginTop: 70,
  },

  estado: {
    paddingHorizontal: 20,
    alignItems: "center",
    marginTop: 40,
  },

  mensagem: {
    color: "#AAAAAA",
    textAlign: "center",
    marginTop: 15,
  },

  botaoTentar: {
    backgroundColor: "#E50914",
    padding: 14,
    borderRadius: 8,
    marginTop: 20,
  },

  textoBotao: {
    color: "#FFFFFF",
    fontWeight: "bold",
  },

  rodape: {
    color: "#666666",
    fontSize: 12,
    textAlign: "center",
    marginTop: 45,
  },
});
