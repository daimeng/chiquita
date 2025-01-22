import './index.css'
import { useEffect, useState } from "react"
import { playerById, tournamentById, tournamentsByIx } from "../idb"
import { STAGE_TO_NUM } from "../priority"
import { init, rating_changes } from "../ratings"

export function sortStartStage(a, b) {
  return b.end === a.end
    ? a.team === b.team
      ? STAGE_TO_NUM[a.stage] - STAGE_TO_NUM[b.stage]
      : b.team - a.team
    : b.end - a.end
}

export function TournamentCard({ event_id, close, showPlayer }) {
  const tourney = tournamentById.get(event_id)
  const [matches, setMatches] = useState([])

  useEffect(() => {
    init.then((db) => {
      return db.getAllFromIndex('matches', 'event_id', event_id)
    }).then((matches) => {
      for (let i = matches.length - 1; i >= 0; i--) {
        matches[i].rc = rating_changes.get(matches[i].id)
        matches[i].end = Date.parse(tournamentById.get(matches[i].event_id).EndDateTime)
      }
      matches.sort(sortStartStage)
      setMatches(matches)
    })
  }, [event_id])

  return (
    <div className="bracket-card card">
      <div className="card-header">
        {`[${tourney.EndDate}]`} {tourney.EventName}
        <div className="card-close" onClick={close}>x</div>
      </div>
      <div className="card-content">
        {matches.map(m => {
          return <MatchRow key={m.id} m={m} showPlayer={showPlayer} />
        })}
      </div>
    </div>
  )
}

export function MatchRow({ m, showPlayer }) {
  const scores = m.scores.split(',').map(x => x.split('-'))
  const change1 = Math.round(m.rc.new_r1 - m.rc.r1)
  const change2 = Math.round(m.rc.new_r2 - m.rc.r2)

  return (
    <div key={m.id} className="match-row event-match-row">
      <div className="match-stage">
        {m.team ? 'T' : ''}{m.stage}
      </div>
      <div className={`match-rating-change ${change1 < 0 ? 'match-loss' : ''}`}>{change1}</div>
      <div className="match-ratings">
        {Math.floor(m.rc.r1)}
      </div>
      <div className="match-opponent" data-playerid={m.a_id} onClick={showPlayer}>{playerById.get(m.a_id).name}</div>
      <div className="match-res">{m.res_a} - {m.res_x}</div>
      <div className="match-opponent" data-playerid={m.x_id} onClick={showPlayer}>{playerById.get(m.x_id).name}</div>
      <div className="match-ratings">
        {Math.floor(m.rc.r2)}
      </div>
      <div className={`match-rating-change ${change2 < 0 ? 'match-loss' : ''}`}>{change2}</div>
      <div className="match-scores">
        {scores.map((set, i) =>
          <div key={i} className="match-scores-set">
            <div>{set[0]}</div>
            <div>{set[1]}</div>
          </div>
        )}
      </div>
    </div>
  )
}