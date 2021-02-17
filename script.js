// contains the full timeilne
const yearSVG = d3.select("svg.year");
const yearSize = { w: 300, h: 500 };
const yearMargin = { t: 20, r: 40, b: 40, l: 60 };
const yearG = yearSVG.append("g").classed("year-container", true);
yearSVG.attr("width", yearSize.w).attr("height", yearSize.h);

// contains the detailed bar chart
const mapSVG = d3.select("svg.map");
const mapSize = { w: 800, h: 500 };
const mapG = mapSVG.append("g").classed("map-container", true);
mapSVG.attr("width", mapSize.w).attr("height", mapSize.h);

const bubblesG = mapSVG.append("g").classed("bubbles", true);

const dropdown = d3.select("select");

let netflixData, mapData;
let xScale, yScale, rScale, colorScale;
let projection, path;
let xAxis, yAxis, xAxisLabel, yAxisLabel, genres;

Promise.all([
	d3.csv("data/netflix_cleaned.csv"),
	d3.json("data/map/world.geo.json"),
]).then(function (datasets) {
	netflixData = datasets[0];
	mapData = datasets[1];
	console.log(netflixData);
	console.log(mapData);

	populateGenres();
	drawBars();
	drawMap(mapG, mapData, netflixData);
});

function populateGenres() {
	let dropdown = document.getElementById("genre");
	let genre1 = netflixData.map((el) => el.genre1);
	let genre2 = netflixData.map((el) => el.genre2);
	let genre3 = netflixData.map((el) => el.genre3);
	genres = genre1.concat(genre2).concat(genre3);
	genres = [...new Set(genres)];

	let genresTv = genres.filter((el) => el.split(" ").includes("TV"));
	let genresMovie = genres.filter((el) => el.split(" ").includes("Movies"));
	let genresOther = genres
		.filter((genre) => genresTv.indexOf(genre) == -1)
		.filter((genre) => genresMovie.indexOf(genre) == -1)
		.filter((genre) => genre !== "NA");

	let options = ["Movie", "TV", "Other"];
	options.forEach((option) => {
		let optGroup = document.createElement("optgroup");
		optGroup.label = option;
		optGroup.id = option;
		dropdown.add(optGroup);
	});

	let optGroup = document.getElementsByTagName("optgroup");

	addOptions(0, genresMovie);
	addOptions(1, genresTv);
	addOptions(2, genresOther);

	function addOptions(optIndex, genres) {
		genres.forEach((genre) => {
			optGroup[optIndex].appendChild(new Option(genre, genre));
		});
	}
}

function drawBars(data = netflixData) {
	data = d3.group(data, (d) => +d.releaseYear);
	data = Array.from(data);
	data = data.sort(function (a, b) {
		return a[0] - b[0];
	});

	let years = data.map((d) => d[0]);

	xScale = d3
		.scaleLinear()
		.domain(d3.extent(data, (d) => d[1].length))
		.range([yearMargin.l, yearSize.w - yearMargin.r]);

	yScale = d3
		.scaleBand()
		.padding(0.3)
		.domain(years)
		.range([yearMargin.t, yearSize.h - yearMargin.b]);

	let xValues = [200, 400, 600, 800, 1000];
	xValues.forEach((value) => drawVerticalGrid(value));

	xAxis = yearG
		.append("g")
		.attr("class", "axis")
		.attr("transform", `translate(0,${yearSize.h - yearMargin.b})`)
		.call(d3.axisBottom().scale(xScale).ticks(5));

	yAxis = yearG
		.append("g")
		.attr("class", "axis")
		.attr("transform", `translate(${yearMargin.l},0)`)
		.call(
			d3
				.axisLeft()
				.scale(yScale)
				.tickValues(
					yScale.domain().filter((d) => {
						return +d % 5 === 0;
					})
				)
		);

	let circles = yearG
		.selectAll("rect")
		.data(data)
		.join("rect")
		.attr("width", (d) => xScale(d[1].length) - yearMargin.l)
		.attr("height", yScale.bandwidth())
		.attr("x", (d) => xScale(0))
		.attr("y", (d) => yScale(d[0]))
		.attr("fill", "#e30715")
		.attr("fill-opacity", ".8")
		.attr("stroke", "#e30715")
		.attr("stroke-width", ".4");

	xAxisLabel = yearG
		.append("text")
		.attr("class", "axis-label")
		.attr("x", yearSize.w / 2)
		.attr("y", yearSize.h)
		.text("Releases");

	yAxisLabel = yearG
		.append("text")
		.attr("class", "axis-label")
		.attr("transform", "rotate(-90)")
		.attr("x", -yearSize.h / 2)
		.attr("y", yearMargin.l / 3)
		.text("Year");
}

function drawVerticalGrid(xValue) {
	yearG
		.append("line")
		.classed("grid", true)
		.attr("x1", xScale(xValue))
		.attr("y1", yearMargin.t)
		.attr("x2", xScale(xValue))
		.attr("y2", yearSize.h - yearMargin.b);
}

function drawMap(mapG, mapData, netflixData) {
	projection = d3.geoMercator().fitSize([mapSize.w, mapSize.h], mapData);
	path = d3.geoPath(projection);
	mapG.selectAll("path")
		.data(mapData.features)
		.enter()
		.append("path")
		.attr("country", (d) => d.properties.brk_name)
		.attr("d", (d) => path(d));

	let dataByType = d3.group(netflixData, (d) => d.type);
	dataByType = Array.from(dataByType);

	let tv = dataByType[0][1];
	let movie = dataByType[1][1];

	let movieByCountry = d3.group(movie, (d) => d.country1);
	movieByCountry = Array.from(movieByCountry);

	let tvByCountry = d3.group(tv, (d) => d.country1);
	tvByCountry = Array.from(tvByCountry);

	rScale = d3
		.scaleSqrt()
		.domain(d3.extent(movieByCountry, (d) => d[1].length))
		.range([5, 30]);

	colorScale = d3
		.scaleSequential()
		.domain(d3.extent(tvByCountry, (d) => d[1].length))
		.interpolator(d3.interpolateRgb("black", "#e30715"));

	let countriesMovie = movieByCountry.map((el) => el[0]);
	// console.log(countriesMovie); // 77 countries
	let countriesMovieMapData = mapData.features.filter((el) =>
		countriesMovie.includes(el.properties.brk_name)
	);
	// console.log(countriesMovieMapData); // 68 countries
	let long, lat;

	let bubbles = bubblesG
		.selectAll("circle")
		.data(countriesMovieMapData)
		.join("circle")
		.classed("bubbles", true)
		.attr("cx", (d) => {
			let long = turf.centerOfMass(d).geometry.coordinates[0];
			return projection([long, lat])[0];
		})
		.attr("cy", (d) => {
			let lat = turf.centerOfMass(d).geometry.coordinates[1];
			return projection([long, lat])[1];
		})
		.attr("r", (d) => {
			let country = d.properties.brk_name;
			let dataForThis = movieByCountry.filter((el) => el[0] === country);
			return rScale(dataForThis[0][1].length);
		})
		.attr("fill", (d) => {
			let country = d.properties.brk_name;
			let dataForThis = tvByCountry.filter((el) => el[0] === country);
			if (dataForThis.length > 0) {
				return colorScale(dataForThis[0][1].length);
			}
			return "#ccc";
		});
}
