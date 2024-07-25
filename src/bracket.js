import './bracket.css'
import { forwardRef, useCallback, useContext, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import DRAWS from './draws2024.json'
import { playerById } from './idb'
import { ISO3to2 } from './country-map'
import { all_ratings } from './ratings'

export function BracketMatch({ p1, p2, players, setPlayer, idx, showRatings }) {
	if (p1 === 0 || p2 === 0) {
		return (
			<div className="bracket-match bracket-hidden">
				<div className="bracket-player"></div>
				<div className="bracket-player"></div>
			</div>
		)
	}
	return (
		<div className="bracket-match">
			{p1 != null
				? <MatchPlayer playerid={p1} idx={idx} onClick={setPlayer} players={players} showRatings={showRatings} />
				: <div className="bracket-player"></div>
			}
			{p2 != null
				? <MatchPlayer playerid={p2} idx={idx} onClick={setPlayer} players={players} showRatings={showRatings} />
				: <div className="bracket-player"></div>
			}
		</div>
	)
}

function MatchPlayer({ playerid, idx, onClick, players, showRatings }) {
	const latest_ratings = all_ratings[all_ratings.length - 1]
	const player = playerById.get(playerid)
	const latest = latest_ratings.get(playerid)
	let r = latest ? Math.floor(latest.rating) : 0
	r = Math.min(Math.max(r - 1400, 100), 1000)

	return (
		<div data-id={playerid} data-idx={idx} onClick={onClick}
			className={`bracket-player ${players[idx] === playerid ? 'bracket-winner' : ''}`}>
			<span className={`fi fis fi-${ISO3to2[player.org]}`}></span>
			<span className="bracket-org">{player.org}</span>
			{" "}
			{player.name}
			{showRatings && <span className="bracket-ratings" style={{ backgroundPositionY: r }}>{latest && Math.floor(latest.rating)}</span>}
		</div>
	)
}

// [0, 1, 1, 2, 2, 2, 2]
// 0, 1, 3, 7
export function BracketRound({ r, players, setPlayer, showRatings }) {
	const match_count = r / 2
	const base_idx = match_count - 1

	const matches = new Array(match_count)
	for (let i = 0; i < match_count; i++) {
		const a_id = players[r - 1 + 2 * i]
		const x_id = players[r + 2 * i]
		matches[i] = <BracketMatch
			key={i}
			p1={a_id}
			p2={x_id}
			idx={base_idx + i}
			players={players}
			setPlayer={setPlayer}
			showRatings={showRatings}
		/>
	}

	return (
		<div className="bracket-round">
			{matches}
		</div>
	)
}

export function Bracket({ players, setPlayer, showRatings }) {
	let roundof = (players.length + 1) / 2
	const rounds = []
	// roundof 2 is finals
	while (roundof > 1) {
		rounds.push(
			<BracketRound r={roundof} key={roundof} players={players} setPlayer={setPlayer} showRatings={showRatings} />
		)
		roundof /= 2
	}

	return (
		<div className="bracket">
			{rounds}
		</div>
	)
}

const EVENTS = ['M', 'W', 'X', 'MT', 'WT']

export function BracketCard({ hideBracket }) {
	const [event, setEvent] = useState('M')
	const [showRatings, setShowRatings] = useState(false)
	const toggleRatings = useCallback(() => {
		setShowRatings(r => !r)
	}, [setShowRatings])

	const refM = useRef(null)
	const refW = useRef(null)
	console.log(refM)

	return (
		<div className="bracket-card card">
			<div className="card-header">
				<div className="bracket-event">
					{EVENTS.map(e =>
						<button type="button" key={e} className={e === event ? `active` : ''} onClick={() => setEvent(e)}>{e}</button>
					)}
				</div>
				<div className="show-ratings" onClick={toggleRatings}>[{showRatings ? `x` : ' '}]show ratings</div>
				<button type="button" className="export-brackets" onClick={() => {
					refM.current.getCode()
				}}>Export</button>
				<div className="card-close" onClick={hideBracket}>x</div>
			</div>
			<div className="card-content">
				<BracketContent
					ref={refM}
					hidden={event !== 'M'}
					event={'M'}
					showRatings={showRatings}
				/>
				<BracketContent
					ref={refW}
					hidden={event !== 'W'}
					event={'W'}
					showRatings={showRatings}
				/>
			</div>
		</div>
	)
}

const BracketContent = forwardRef(({ event, showRatings, hidden }, ref) => {
	const draws = DRAWS[event]

	const [players, setPlayers] = useState(() => {
		// check if prelims
		let len = 0
		for (let i = 1; i <= draws.length; i *= 2) {
			len += i
		}
		// 1 + 2 + 4 + 8 + 16 + 32
		const draw_idx = draws.length - 1

		const p = new Array(len).fill(null)
		if (event === 'M' || event === 'W') {
			p.push(...new Array(128).fill(0))
		}

		for (let i = 0; i < draws.length; i++) {
			const idx = draw_idx + i
			if (Number.isInteger(draws[i])) {
				p[idx] = draws[i]
			} else {
				const [a_id, x_id] = draws[i]
				p[idx] = null
				p[idx * 2 + 1] = Number(a_id)
				p[idx * 2 + 2] = Number(x_id)
			}
		}
		return p
	})

	const setPlayer = useCallback((e) => {
		const { idx, id } = e.target.dataset
		setPlayers(p => {
			const n = [...p]

			let parent = Number(idx)
			while (parent >= 0) {
				const replaced = n[parent]
				// toggle off
				if (n[parent] === Number(id)) {
					n[parent] = null
				} else { // toggle on
					n[parent] = Number(id)
				}
				// don't fill to root
				if (replaced == null) break

				// check if parent is same as replaced
				parent = Math.floor((parent - 1) / 2)
				if (n[parent] != replaced) break
			}

			return n
		})
	}, [setPlayers])

	useImperativeHandle(ref, () => ({
		getCode() {
			console.log(players)
		}
	}), [players])

	return (
		<div className={hidden ? 'hidden' : ''}>
			<Bracket players={players} draws={draws} setPlayer={setPlayer} showRatings={showRatings} />
		</div>
	)
})