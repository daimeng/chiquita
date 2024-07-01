export const DEFAULT_CONFIG = {
	init_r: 1500,
	init_rd: 350,
	q: Math.log(10) / 400,
	c: 1,
}

const PISQ = Math.PI * Math.PI

export function glicko({ q = DEFAULT_CONFIG.q, c = DEFAULT_CONFIG.c, init_rd = DEFAULT_CONFIG.init_rd, init_r = DEFAULT_CONFIG.init_r } = {}) {
	function g(rd) {
		return 1 / (1 + 3 * (q * q) * (rd * rd) / PISQ) ** 0.5
	}

	function E(r, ri, rdi) {
		return 1 / (1 + 10 ** (g(rdi) * (ri - r) / 400))
	}

	function d2(r, ri, rdi) {
		const inner = (g(rdi) ** 2) * E(r, ri, rdi) * (1 - E(r, ri, rdi))
		return 1 / ((q * q) * inner)
	}

	function new_rd(rd, d2) {
		return 1 / ((1 / rd ** 2) + (1 / d2)) ** 0.5
	}

	function new_rating(r, rd, ri, rdi, s, d2) {
		return r + (q / ((1 / rd ** 2) + (1 / d2))) * g(rdi) * (s - E(r, ri, rdi))
	}

	const c2 = c * c
	function increase_rd_over_time(player_ratings, current_time) {
		for (let [player, rating] of player_ratings) {
			// Calculate time elapsed in days
			const days_inactive = Math.floor((current_time - rating.last_active) / 84600000)
			if (days_inactive > 0) {
				// Increase RD based on time elapsed
				player_ratings.set(player, {
					...rating,
					rd: Math.min(
						Math.sqrt(rating.rd ** 2 + c2 * days_inactive),
						init_rd
					)
				})
			}
		}
	}

	function update_ratings(player_ratings, match_results, current_time) {
		increase_rd_over_time(player_ratings, current_time)

		for (let i = 0; i < match_results.length; i++) {
			const { a_id: player1, x_id: player2, res_a, res_x } = match_results[i]
			const result = res_a > res_x ? 1 : 0
			const { rating: r1, rd: rd1 } = player_ratings.get(player1) || {
				rating: init_r,
				rd: init_rd,
				last_active: current_time
			}
			const { rating: r2, rd: rd2 } = player_ratings.get(player2) || {
				rating: init_r,
				rd: init_rd,
				last_active: current_time
			}

			const d2_1 = d2(r1, r2, rd2)
			const d2_2 = d2(r2, r1, rd1)

			const new_rd1 = new_rd(rd1, d2_1)
			const new_rd2 = new_rd(rd2, d2_2)

			const new_r1 = new_rating(r1, rd1, r2, rd2, result, d2_1)
			const new_r2 = new_rating(r2, rd2, r1, rd1, 1 - result, d2_2)

			player_ratings.set(player1, {
				rating: new_r1,
				rd: new_rd1,
				last_active: current_time
			})
			player_ratings.set(player2, {
				rating: new_r2,
				rd: new_rd2,
				last_active: current_time
			})
		}
	}

	return { update_ratings }
}
