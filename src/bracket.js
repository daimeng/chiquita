import './bracket.css'
import { forwardRef, useCallback, useContext, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import DRAWS from './draws2024.json'
import { playerById } from './idb'
import { ISO3Name, ISO3to2 } from './country-map'
import { all_ratings } from './ratings'
import { encodePlayers, hydratePlayers, playersFromDraw } from './encode'
import { DoublesWinners, SinglesWinners, TeamWinners } from './leaderboard'
import { scoreBracket } from './score'

export function BracketMatch({ RenderPlayer, p1, p2, players, setPlayer, idx, showRatings }) {
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
				? <RenderPlayer playerid={p1} idx={idx} onClick={setPlayer} players={players} showRatings={showRatings} />
				: <div className="bracket-player"></div>
			}
			{p2 != null
				? <RenderPlayer playerid={p2} idx={idx} onClick={setPlayer} players={players} showRatings={showRatings} />
				: <div className="bracket-player"></div>
			}
		</div>
	)
}

function MatchPlayer({ playerid, idx, onClick, players, showRatings }) {
	const pid = Number(playerid)
	const latest_ratings = all_ratings[all_ratings.length - 1]
	const player = playerById.get(pid)
	const latest = latest_ratings.get(pid)
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

function MatchDoubles({ playerid: pairid, idx, onClick, players }) {
	const [a_id, b_id] = pairid.split(':')
	const a = playerById.get(Number(a_id))
	const b = playerById.get(Number(b_id))

	return (
		<div data-id={pairid} data-idx={idx} onClick={onClick}
			className={`bracket-player ${players[idx] === pairid ? 'bracket-winner' : ''}`}>
			<span className={`fi fis fi-${ISO3to2[a.org]}`}></span>
			<span className="bracket-org">{a.org}</span>
			{" "}
			{a.name}/{b.name}
		</div>
	)
}

function MatchTeams({ playerid: country, idx, onClick, players }) {
	return (
		<div data-id={country} data-idx={idx} onClick={onClick}
			className={`bracket-player ${players[idx] === country ? 'bracket-winner' : ''}`}>
			<span className={`fi fis fi-${ISO3to2[country]}`}></span>
			<span className="bracket-org">{country}</span>
			{" "}
			{ISO3Name[country]}
		</div>
	)
}

// [0, 1, 1, 2, 2, 2, 2]
// 0, 1, 3, 7
export function BracketRound({ RenderPlayer, r, players, setPlayer, showRatings }) {
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
			RenderPlayer={RenderPlayer}
		/>
	}

	return (
		<div className="bracket-round">
			{matches}
		</div>
	)
}

export function Bracket({ RenderPlayer, players, setPlayer, showRatings }) {
	let roundof = (players.length + 1) / 2
	const rounds = []
	// roundof 2 is finals
	while (roundof > 1) {
		rounds.push(
			<BracketRound
				r={roundof} key={roundof}
				RenderPlayer={RenderPlayer}
				players={players} setPlayer={setPlayer} showRatings={showRatings} />
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

	const [tab, setTab] = useState('brackets')

	const refs = {
		M: useRef(null),
		W: useRef(null),
		X: useRef(null),
		MT: useRef(null),
		WT: useRef(null),
	}

	const data = {
		M: localStorage.getItem('bracket-2024-M'),
		W: localStorage.getItem('bracket-2024-W'),
		X: localStorage.getItem('bracket-2024-X'),
		MT: localStorage.getItem('bracket-2024-MT'),
		WT: localStorage.getItem('bracket-2024-WT'),
	}

	return (
		<div className="bracket-card card">
			<div className="card-header">
				{tab === 'brackets' && <>
					<div className="bracket-event">
						{EVENTS.map(e =>
							<button type="button" key={e} className={e === event ? `active` : ''} onClick={() => setEvent(e)}>{e}</button>
						)}
					</div>
					<div className="show-ratings" onClick={toggleRatings}>[{showRatings ? `x` : ' '}]show ratings</div>
					<button type="button" className="export-brackets" onClick={() => {
						let ret = ''
						for (let ev of EVENTS) {
							ret += `${ev}:${refs[ev].current.getCode()}\n`
						}
						document.querySelector('.export-brackets .tooltip').classList.add('shown')
						document.querySelector('.export-brackets .tooltip-content').innerText = ret
						navigator.clipboard.writeText(ret)
					}}>
						Export
						<div className="tooltip">
							<div className="tooltip-header">
								Copied to Clipboard!
								<span onClick={(e) => {
									e.stopPropagation()
									document.querySelector('.export-brackets .tooltip').classList.remove('shown')
								}}>{' [x]'}</span>
							</div>
							<div className="tooltip-content"></div>
						</div>
					</button>
					<button onClick={() => setTab('leaderboard')}>
						Leaderboard
					</button>
				</>}
				{tab === 'leaderboard' && <>
					<button onClick={() => setTab('brackets')}>
						My Brackets
					</button>
				</>}
				<div className="card-close" onClick={hideBracket}>x</div>
			</div>
			<div className="card-content">
				{tab === 'brackets' && <>
					<BracketContent
						ref={refs['M']}
						initData={data['M']}
						hidden={event !== 'M'}
						event={'M'}
						showRatings={showRatings}
						RenderPlayer={MatchPlayer}
					/>
					<BracketContent
						ref={refs['W']}
						initData={data['W']}
						hidden={event !== 'W'}
						event={'W'}
						showRatings={showRatings}
						RenderPlayer={MatchPlayer}
					/>
					<BracketContent
						className="bracket-X"
						ref={refs['X']}
						initData={data['X']}
						hidden={event !== 'X'}
						event={'X'}
						showRatings={showRatings}
						RenderPlayer={MatchDoubles}
					/>
					<BracketContent
						ref={refs['MT']}
						initData={data['MT']}
						hidden={event !== 'MT'}
						event={'MT'}
						showRatings={showRatings}
						RenderPlayer={MatchTeams}
					/>
					<BracketContent
						ref={refs['WT']}
						initData={data['WT']}
						hidden={event !== 'WT'}
						event={'WT'}
						showRatings={showRatings}
						RenderPlayer={MatchTeams}
					/>
				</>}
				{tab === 'leaderboard' && <Leaderboard />}
			</div>
		</div>
	)
}

const BracketContent = forwardRef(({ initData, className, RenderPlayer, event, showRatings, hidden }, ref) => {
	const draws = DRAWS[event]

	const [players, setPlayers] = useState(() => {
		const p = playersFromDraw(draws)

		if (initData) hydratePlayers(p, initData)
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
				if (n[parent] === id) {
					n[parent] = null
				} else { // toggle on
					n[parent] = id
				}
				// don't fill to root
				if (replaced == null) break

				// check if parent is same as replaced
				parent = Math.floor((parent - 1) / 2)
				if (n[parent] != replaced) break
			}

			localStorage.setItem(`bracket-2024-${event}`, encodePlayers(n))
			return n
		})
	}, [setPlayers])

	useImperativeHandle(ref, () => ({
		getCode() {
			return encodePlayers(players)
		}
	}), [players])

	return (
		<div className={`${className} ${hidden ? 'hidden' : ''}`}>
			<Bracket RenderPlayer={RenderPlayer} players={players} draws={draws} setPlayer={setPlayer} showRatings={showRatings} />
		</div>
	)
})

const draws_cache = {
	M: playersFromDraw(DRAWS.M),
	W: playersFromDraw(DRAWS.W),
	X: playersFromDraw(DRAWS.X),
	MT: playersFromDraw(DRAWS.MT),
	WT: playersFromDraw(DRAWS.WT),
}

function Leaderboard() {
	const [brackets, setBrackets] = useState([])
	const [selected, setSelected] = useState(null)
	const [results, setResults] = useState(null)

	useEffect(() => {
		(async () => {
			// every 300 seconds cache break
			const resp = await fetch(`https://gist.githubusercontent.com/daimeng/1dbb47917e25458719f44c917756af7e/raw/brackets.json?c=${Math.floor(Date.now() / 300000)}`)
			const data = await resp.json()

			// convert data
			for (let i = 0; i < data.length; i++) {
				data[i].updated_at = data[i].updated_at.slice(0, 10) + ' ' + data[i].updated_at.slice(11, 16)
				data[i].players = {
					M: [...draws_cache.M],
					W: [...draws_cache.W],
					X: [...draws_cache.X],
					MT: [...draws_cache.MT],
					WT: [...draws_cache.WT],
				}

				if (data[i].M)
					hydratePlayers(data[i].players.M, data[i].M)
				if (data[i].W)
					hydratePlayers(data[i].players.W, data[i].W)
				if (data[i].X)
					hydratePlayers(data[i].players.X, data[i].X)
				if (data[i].MT)
					hydratePlayers(data[i].players.MT, data[i].MT)
				if (data[i].WT)
					hydratePlayers(data[i].players.WT, data[i].WT)
			}
			setBrackets(data)
		})()
	}, [setBrackets])

	useEffect(() => {
		(async () => {
			const resp = await fetch(`https://gist.githubusercontent.com/daimeng/dc1f8d40eebb608c69b02dbe82ef3eb5/raw/results2024.json?c=${Math.floor(Date.now() / 300000)}`)
			const data = await resp.json()

			data.players = {
				M: [...draws_cache.M],
				W: [...draws_cache.W],
				X: [...draws_cache.X],
				MT: [...draws_cache.MT],
				WT: [...draws_cache.WT],
			}

			hydratePlayers(data.players.M, data.M)
			hydratePlayers(data.players.W, data.W)
			hydratePlayers(data.players.X, data.X)
			hydratePlayers(data.players.MT, data.MT)
			hydratePlayers(data.players.WT, data.WT)
			setResults(data)
		})()
	}, [setResults])

	const scores = useMemo(() => {
		const s = new Array(brackets.length)

		if (results != null) {
			const baseScores = {
				M: scoreBracket(results.players.M, results.players.M),
				W: scoreBracket(results.players.W, results.players.W),
				X: scoreBracket(results.players.X, results.players.X),
				MT: scoreBracket(results.players.MT, results.players.MT),
				WT: scoreBracket(results.players.WT, results.players.WT),
			}

			for (let i = 0; i < brackets.length; i++) {
				s[i] = {
					M: scoreBracket(brackets[i].players.M, results.players.M) - baseScores.M,
					W: scoreBracket(brackets[i].players.W, results.players.W) - baseScores.W,
					X: scoreBracket(brackets[i].players.X, results.players.X) - baseScores.X,
					MT: scoreBracket(brackets[i].players.MT, results.players.MT) - baseScores.MT,
					WT: scoreBracket(brackets[i].players.WT, results.players.WT) - baseScores.WT,
				}
			}
		} else {
			for (let i = 0; i < brackets.length; i++) {
				s[i] = {
					M: 0,
					W: 0,
					X: 0,
					MT: 0,
					WT: 0,
				}
			}
		}

		return s
	}, [brackets, results])

	const showBracket = useCallback((e) => {
		const { idx, event } = e.target.dataset
		setSelected({ idx: Number(idx), event })
	}, [setSelected])

	return (
		<div className="leaderboard-tab">
			{selected != null && <div className="close-selection" onClick={() => setSelected(null)}>{"<< GO BACK"}</div>}
			{selected == null && <table className="leaderboard">
				<thead>
					<tr>
						<th>User</th>
						<th>Mens</th>
						<th>Womens</th>
						<th>Doubles</th>
						<th>TeamsM</th>
						<th>TeamsW</th>
						<th>Updated</th>
					</tr>
				</thead>
				<tbody>
					{brackets.map((bracket, i) => {
						const { M, W, X, MT, WT } = bracket.players

						return (
							<tr key={bracket.user}>
								<td>{bracket.user}</td>
								<SinglesWinners idx={i} event={'M'} onClick={showBracket} p={M} scores={scores} />
								<SinglesWinners idx={i} event={'W'} onClick={showBracket} p={W} scores={scores} />
								<DoublesWinners idx={i} event={'X'} onClick={showBracket} p={X} scores={scores} />
								<TeamWinners idx={i} event={'MT'} onClick={showBracket} p={MT} scores={scores} />
								<TeamWinners idx={i} event={'WT'} onClick={showBracket} p={WT} scores={scores} />
								<td>
									{bracket.updated_at}
									<div className="score">
										Total: {scores[i].M + scores[i].W + scores[i].X + scores[i].MT + scores[i].WT}
									</div>
								</td>
							</tr>
						)
					})}
				</tbody>
			</table>}
			{selected != null &&
				<BracketView
					players={brackets[selected.idx].players[selected.event]}
					event={selected.event}
				/>
			}
		</div>
	)
}

const EMPTY = () => null

function BracketView({ players, className, event }) {
	let RenderPlayer = MatchPlayer
	if (event === 'X') RenderPlayer = MatchDoubles
	else if (event === 'MT' || event === 'WT') RenderPlayer = MatchTeams

	return (
		<div className={`${className}`}>
			<Bracket
				RenderPlayer={RenderPlayer} players={players} setPlayer={EMPTY} showRatings={false} />
		</div>
	)
}
