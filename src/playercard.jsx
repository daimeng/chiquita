import { isoFormat, scaleLinear, scaleLog, scaleTime, utcFormat, utcMonth } from 'd3'
import './playercard.css'
import tournaments from './tournaments.json'
import { useCallback, useEffect, useMemo, useState } from "react"
import { playerById, tournamentById } from "./idb"
import { all_ranks_by_id, init, player_ratings, rating_changes } from "./ratings"
import { STAGE_TO_NUM } from "./priority"

function sortStartStage(a, b) {
  return b.start === a.start
    ? STAGE_TO_NUM[a.stage] - STAGE_TO_NUM[b.stage]
    : b.start - a.start
}

export function PlayerCard({ playerid, showPlayer, hidePlayer }) {
  const player = playerById.get(playerid)
  const [matches, setMatches] = useState([])
  const [showVenue, setShowVenue] = useState(true)

  useEffect(() => {
    init.then((db) => {
      return Promise.all([
        db.getAllFromIndex('matches', 'a_id', playerid),
        db.getAllFromIndex('matches', 'x_id', playerid)
      ])
    }).then(([matches_a, matches_x]) => {
      // decorate matches with their rating changes
      const all_matches = []
      for (let i = matches_a.length - 1; i >= 0; i--) {
        matches_a[i].rc = rating_changes.get(matches_a[i].id)
        matches_a[i].start = Date.parse(tournamentById.get(matches_a[i].event_id).StartDateTime)
        all_matches.push(matches_a[i])
      }
      for (let i = matches_x.length - 1; i >= 0; i--) {
        matches_x[i].rc = rating_changes.get(matches_x[i].id)
        matches_x[i].start = Date.parse(tournamentById.get(matches_x[i].event_id).StartDateTime)
        all_matches.push(matches_x[i])
      }
      all_matches.sort(sortStartStage)
      setMatches(all_matches)
    })
  }, [playerid])

  const rating = player_ratings.get(playerid)

  return (
    <div className="player-card card">
      <div className="card-header">
        {`[${Math.floor(rating.rating)} ± ${Math.floor(rating.rd)}]`} {player.name}
        <a className="toggle-venue" onClick={() => setShowVenue(v => !v)}>{showVenue ? 'Show Ratings' : 'Show Venues'}</a>
        <div className="card-close" onClick={hidePlayer}>x</div>
      </div>
      <div className="card-content">
        <PlayerGraph playerid={playerid} matches={matches} />
        {matches.map(m => {
          const tourney = tournamentById.get(m.event_id)
          const scores = m.scores.split(',').map(x => x.split('-'))
          const change = Math.round(m.rc.new_r1 - m.rc.r1)

          if (m.a_id === playerid) {
            return <div key={m.id} className={`match-row ${change < 0 ? 'match-loss' : ''}`}>
              <div className="match-rating-change">{change}</div>
              <div className="match-res">{m.res_a} - {m.res_x}</div>
              {!showVenue && <div className="match-ratings">
                <span>{Math.floor(m.rc.r1)}</span>
                {' '}
                <span>{Math.floor(m.rc.r2)}</span>
              </div>}
              <div className="match-opponent" data-playerid={m.x_id} onClick={showPlayer}>{playerById.get(m.x_id).name}</div>
              <div className="match-date">{tourney.EndDate}</div>
              {showVenue && <div className="match-event">{tourney.ShortName}</div>}
              <div className="match-scores">
                {scores.map((set, i) =>
                  <div key={i} className="match-scores-set">
                    <div>{set[0]}</div>
                    <div>{set[1]}</div>
                  </div>
                )}
              </div>
            </div>
          } else {
            const change = Math.round(m.rc.new_r2 - m.rc.r2)
            return <div key={m.id} className={`match-row ${change < 0 ? 'match-loss' : ''}`}>
              <div className="match-rating-change">{change}</div>
              <div className="match-res">{m.res_x} - {m.res_a}</div>
              {!showVenue && <div className="match-ratings">
                <span>{Math.floor(m.rc.r2)}</span>
                {' '}
                <span>{Math.floor(m.rc.r1)}</span>
              </div>}
              <div className="match-opponent" data-playerid={m.a_id} onClick={showPlayer}>{playerById.get(m.a_id).name}</div>
              <div className="match-date">{tourney.EndDate}</div>
              {showVenue && <div className="match-event">{tourney.ShortName}</div>}
              <div className="match-scores">
                {scores.map((set, i) =>
                  <div key={i} className="match-scores-set">
                    <div>{set[1]}</div>
                    <div>{set[0]}</div>
                  </div>
                )}
              </div>
            </div>
          }
        })}
      </div>
    </div>
  )
}

export function EmptyCard({ hidePlayer }) {
  return (
    <div className="player-card card empty-card">
      <div className="card-header">
        <div className="card-close" onClick={hidePlayer}>x</div>
      </div>
      <div className="card-content">
      </div>
    </div>
  )
}

const SVG_START = 40
const SVG_TOP = 10
const SVG_BOT = 300
const GRAPH_START = Date.parse('01 Jan 2021 00:00:00 GMT')
const GRAPH_END = new Date()
const GRAPH_SCALE_X = [GRAPH_START, GRAPH_END]
const GRAPH_SCALE_Y = [1400, 2400]
const ISOMONTH = utcFormat("%Y-%m")

export function PlayerGraph({ playerid, matches }) {
  // for (let i in tournaments) {
  //   const t = tournaments[i]
  //   t.EndDateTime
  // }
  // all_ranks_by_id[].get(playerid)

  const validMatches = useMemo(() => {
    let v = []
    let curr = null
    matches.forEach(m => {
      // if new tournament, add new entry
      if (curr == null || curr.start !== m.start) {
        if (playerid === m.a_id) {
          curr = { start: m.start, rating: m.rc.new_r1, rd: m.rc.new_rd1 }
        } else {
          curr = { start: m.start, rating: m.rc.new_r2, rd: m.rc.new_rd2 }
        }
        v.push(curr)
      } else {
        if (playerid === m.a_id) {
          if (curr.rd > m.rc.new_rd1) {
            curr.rd = m.rc.new_rd1
            curr.rating = m.rc.new_r1
          }
        } else {
          if (curr.rd > m.rc.new_rd2) {
            curr.rd = m.rc.new_rd2
            curr.rating = m.rc.new_r2
          }
        }
      }
    })

    return v
  }, [matches])

  const [width, setWidth] = useState(null);
  const div = useCallback(node => {
    if (node !== null) {
      setWidth(node.getBoundingClientRect().width);
    }
  }, [])

  const end = width
  const y = scaleLog(GRAPH_SCALE_Y, [0, SVG_BOT])
  const x = scaleTime(GRAPH_SCALE_X, [0, width])
  const xticks = x.ticks(utcMonth.every(6))
  const yticks = y.ticks(10)

  return (
    <div ref={div}>
      <svg className="player-graph" height={SVG_BOT}>
        {xticks.map(t => {
          const xx = x(t)
          return (
            <line className="xticks-line" x1={xx} x2={xx} y1={0} y2={SVG_BOT} stroke="#333" />
          )
        })}
        {xticks.map(t => {
          return (
            <text className="xticks" transform={`translate(${x(t) + 10}, ${SVG_BOT - 30}) rotate(-30)`}>{ISOMONTH(t)}</text>
          )
        })}
        {yticks.map(t => {
          const yy = SVG_BOT - y(t)
          return (
            <line className="yticks-line" x1={0} x2={width} y1={yy} y2={yy} stroke="#333" />
          )
        })}
        {yticks.map(t => {
          return (
            <text className="yticks" transform={`translate(0, ${SVG_BOT - y(t)})`}>{t}</text>
          )
        })}
        <line className="y-axis" x1={SVG_START} y1={SVG_TOP} x2={SVG_START} y2={SVG_BOT - 10} stroke="#eee"></line>
        <line className="x-axis" x1={10} y1={SVG_BOT - 40} x2={end} y2={SVG_BOT - 40} stroke="#eee"></line>
        {validMatches.map(m => {
          return (
            <circle key={m.id}
              opacity={(180 - m.rd) / 100}
              cx={x(m.start)} cy={SVG_BOT - y(m.rating)} r={3} stroke="#eee"
            />
          )
        })}
      </svg>
    </div>
  )
}