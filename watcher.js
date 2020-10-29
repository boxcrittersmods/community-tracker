"strict mode";

const { find } = require('lodash');
const _ = require('lodash');

function diffStr(str1, str2) {
	let diff = "";
	str2.split('').forEach(function (val, i) {
		if (val != str1.charAt(i))
			diff += val;
	});
	return diff;
}

function diffArr(a1, a2) {
	let a = [], diff = [];
	for (let i = 0; i < a1.length; i++) {
		a[a1[i]] = true;
	}
	for (let i = 0; i < a2.length; i++) {
		if (a[a2[i]]) {
			delete a[a2[i]];
		} else {
			a[a2[i]] = true;
		}
	}
	for (let k in a) {
		diff.push(k);
	}
	return diff;
}


class Watcher {
	constructor(query, equal, interval, first) {
		this.query = query;
		this.equal = equal || _.isEqual;
		this.start(interval, first);
	}

	onChange(cb) {
		this.change = cb;
	}

	async start(interval = 5000, first) {
		let last, now;
		var update = async () => {
			now = await this.query();
			if (typeof last == "undefined") last = new now.constructor;
			if (JSON.stringify(now) !== JSON.stringify(last)) {
				let diff;
				if (typeof now == "string") {
					//string
					diff = diffStr(last, now);
				} else if (Array.isArray(now)) {
					//array

					console.log({ last, now });
					diff = _.filter(now,
						i => {
							var includes = _.find(last,
								j => this.equal(i, j)
							);
							return !includes;
						}
					);
					console.log({ diff });
				} else {
					console.error("Watcher error: Object");
					//object
				}
				if (this.change) await this.change(last, now, diff);
				last = now;
			}
		};
		if (first) {
			await update();
		} else {
			last = await this.query();
		}
		this.worker = setInterval(update.bind(this), interval);
	}

	stop() {
		clearInterval(this.worker);
	}
}

module.exports = Watcher;