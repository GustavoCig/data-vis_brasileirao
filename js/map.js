const STATE_DEFAULT_STYLE = {
    fillColor: null,
    weight: '3'
};

const STATE_SELECTED_STYLE = {
    fillColor: '#9A0117',
    weight: '4' 
};

const STATE_HOVERED_STYLE = {
    fillColor: '#ABABAB'
};

const NORTE_STATES = ['AC', 'AM', 'RO', 'RR', 'AP', 'PA', 'TO'];
const NORDESTE_STATES = ['MA', 'PI', 'BA', 'SE', 'AL', 'PE', 'PB', 'RN', 'CE'];
const CENTRO_OESTE_STATES = ['MT', 'MS', 'GO', 'DF'];
const SUDESTE_STATES = ['MG', 'SP', 'RJ', 'ES'];
const SUL_STATES = ['PR', 'SC', 'RS'];

let selected_states = [];
let map_layer;
let club_by_state = club_name_by_state();

function create_map(html_tag, lat, long, magnification, options) {
    let options_is_set = typeof options != 'undefined'
                        && options != null;
    // If options object isnt set, uses default config
    options = options_is_set ? options : {
        minZoom:            magnification,
        maxZoom:            magnification,
        dragging:           false,
        zoomControl:        false,
        touchZoom:          false,
        tap:                false,
        doubleClickZoom:    false,
        boxZoom:            false,
    };

    let map = L.map(html_tag, options).setView([lat, long], magnification);
    L.tileLayer("https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png", {
                    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>, &copy; <a href="https://carto.com/attribution">CARTO</a>',
                }).addTo(map);
    return map;
}

function superimpose_geojson(dataset, map) {
    d3.json(dataset).then(function(geojson) {
        features = topojson.feature(geojson, geojson.objects.estados).features
        map_layer = L.geoJson(features, {
            onEachFeature: onEachFeature
        }).addTo(map);
    });
}

function onEachFeature(feature, layer) {
    if (feature.properties && feature.properties.nome) {
        let popup = new L.Popup({closeButton: false, offset: L.point(0, -20)});
        let popupContent = "<strong>" + feature.properties.nome + "</strong></br>" + return_clubs_as_string(club_by_state, feature.properties.nome);
        popup.setContent(popupContent);
        layer.bindPopup(popup);
        layer.on({
            mouseover: function(el) {
                layer.openPopup();
                if(el.target.options.fillColor != STATE_SELECTED_STYLE.fillColor) {
                    el.target.setStyle(STATE_HOVERED_STYLE);
                }
            },
            mouseout: function(el) {
                layer.closePopup();
                if(el.target.options.fillColor != STATE_SELECTED_STYLE.fillColor) {
                    el.target.setStyle(STATE_DEFAULT_STYLE);
                }
            },
            click: select_state
        });
    }
}

function select_state(element) {
    current_state = element.target
    current_state_id = current_state.feature.id;
    state_is_selected = current_state.options.fillColor == STATE_SELECTED_STYLE.fillColor
    if (state_is_selected) {
        selected_states = selected_states.filter(state => state !== current_state_id);
        current_state.setStyle(STATE_DEFAULT_STYLE);
    } else {
        selected_states.push(current_state_id);
        current_state.setStyle(STATE_SELECTED_STYLE);
    }
    selected_club_ids = match_state_to_id(selected_states);
    redraw_charts(selected_club_ids);
}

function match_state_to_id(states) {
    let club_ids = [];
    d3.csv('data/club_by_state.csv').then(function(clubs) {
        clubs.forEach(function(club) {
            if(states.includes(club.estado_id)) {
                club_ids.push(+club.id)
            }
        });
    });
    return club_ids;
}

function redraw_charts(selected_club_ids) {
    goals_bar_chart('goalsChart', CLUB_GOALS_DATA, selected_club_ids);
    standings_series_chart('standingsChart', STANDING_CHART_DATA, selected_club_ids);
    home_away_pie_chart('homeAwayChart', HOME_AWAY_GOALS_DATA, selected_club_ids);
}

function select_states_per_region(state_ids) {
    let flag_turning_off;
    Object.entries(map_layer._layers).forEach(function([key, layer]) {
        if(state_ids.includes(layer.feature.id)) {
            if(layer.options.fillColor == STATE_SELECTED_STYLE.fillColor) {
                layer.setStyle(STATE_DEFAULT_STYLE);
                flag_turning_off = true;
            } else {
                layer.setStyle(STATE_SELECTED_STYLE);
                flag_turning_off = false;
            }
        }
    });
    if(flag_turning_off) {
        state_ids = [];
    }
    selected_club_ids = match_state_to_id(state_ids);
    redraw_charts(selected_club_ids);
}

function club_name_by_state() {
    let club_state_relation = new Object();
    d3.csv('data/club_by_state.csv').then(function(data) {
        data.forEach(function(row) {
            if(typeof club_state_relation[row.estado_nome] == 'undefined') {
                club_state_relation[row.estado_nome] = [row.nome];
            } else {
                club_state_relation[row.estado_nome].push(row.nome);
            }
        });
    });
    return club_state_relation;
}

function return_clubs_as_string(club_state_object, state) {
    let result_string = '';
    if(typeof club_state_object[state] == 'undefined') {
        return result_string;
    }
    club_state_object[state].forEach(function(club) {
        result_string += '<li>' + club + '</li>'
    });
    return result_string;
}
