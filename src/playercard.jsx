import { useEffect, useState } from "react"
import { playerById, tournamentById } from "./idb"
import { init, player_ratings, rating_changes } from "./ratings"
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
              <div className="match-date">{tourney.StartDate}</div>
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
              <div className="match-date">{tourney.StartDate}</div>
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