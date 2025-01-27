import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet';
import './App.css';
import './result.css';
import './intro.css';
import axios from 'axios';

const App = () => {
  const [data, setData] = useState({ usedPlayers: {} });
  const [statValues, setStatValues] = useState({});
  const [currentStats, setCurrentStats] = useState([]);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [isDone, setIsDone] = useState(false);
  const [teamLogos, setTeamLogos] = useState({ home_team_logo: '', away_team_logo: '' });
  const usedPlayerIds = useRef(new Set());

  const [score, setScore] = useState(0);  // Score state
  const [completedQuestions, setCompletedQuestions] = useState([]);
  const [feedbackClasses, setFeedbackClasses] = useState({});
  const inputRefs = useRef([]);
  const [results, setResults] = useState([]);
  const dataFetchedRef = useRef(false);

  const [showIntro, setShowIntro] = useState(true);
  const [questionCircles, setQuestionCircles] = useState(Array(5).fill(true)); // Initial state for 5 questions

  const statLabels = ['PTS', 'AST', 'REB', 'STL', 'BLK', 'TO'];

  useEffect(() => {
    if (!dataFetchedRef.current) {
      fetchData();
      dataFetchedRef.current = true;
    }
  }, []);

  useEffect(() => {
    if (Object.keys(data.usedPlayers).length > 0) {
      const gameId = Object.values(data.usedPlayers)[currentPlayerIndex]?.game_id;
      if (gameId) {
        fetchTeamLogos(gameId);
      }
    }
  }, [data, currentPlayerIndex]);

  const shuffleAndPickPlayers = (players) => {
    const entries = Object.entries(players).filter(([key]) => !usedPlayerIds.current.has(key));

    if (entries.length === 0) {
      usedPlayerIds.current.clear();
      return shuffleAndPickPlayers(players);
    }

    for (let i = entries.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [entries[i], entries[j]] = [entries[j], entries[i]];
    }

    const selectedPlayers = entries.slice(0, 5).reduce((res, [key, value]) => {
      usedPlayerIds.current.add(key);
      return { ...res, [key]: value };
    }, {});

    return selectedPlayers;
  };

  const fetchData = async () => {
    try {
      const response = await fetch('http://localhost:5000/');
      const result = await response.json();
      const selectedPlayers = shuffleAndPickPlayers(result.usedPlayers);
      setData({ ...result, usedPlayers: selectedPlayers });
      resetInputFields();
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const fetchTeamLogos = async (gameId) => {
    try {
      const response = await fetch(`http://localhost:5000/team_logos/${gameId}`);
      const result = await response.json();
      setTeamLogos(result);
    } catch (error) {
      console.error('Error fetching team logos:', error);
    }
  };

  const resetInputFields = () => {
    setStatValues({});
    setFeedbackClasses({});
    const selectedStats = getRandomStats();
    setCurrentStats(selectedStats);
    inputRefs.current.forEach((input) => {
      if (input) {
        input.disabled = false;
        input.parentElement.style.backgroundColor = '';
      }
    });
  };

  const getRandomStats = () => {
    const shuffled = [...statLabels].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 3);
  };

  const handleInputChange = (event, stat) => {
    const value = event.target.value;
    setStatValues((prevValues) => ({ ...prevValues, [stat]: value }));
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleSubmit();
    }
  };

  const evaluateInputs = () => {
    const players = Object.values(data.usedPlayers);
    const playerData = players[currentPlayerIndex]?.player_data;
    if (!playerData) {
      console.error("Player data not found for current index");
      return 0;
    }

    let correctCount = 0;
    currentStats.forEach((stat) => {
      const userStatValue = parseInt(statValues[stat], 10);
      const correctValue = playerData[stat];

      if (statValues[stat] !== undefined && correctValue !== undefined) {
        if (userStatValue === correctValue) {
          setFeedbackClasses((prevClasses) => ({ ...prevClasses, [stat]: 'correct' }));
          correctCount += 1;
        } else {
          setFeedbackClasses((prevClasses) => ({ ...prevClasses, [stat]: 'incorrect' }));
        }
      }
    });

    return correctCount;
  };

  const getMaxScore = () => {
    return currentStats.length * (currentPlayerIndex + 1);
  };

  const getCurrentTeamColors = () => {
    const currentTeamColors = Object.values(data.usedPlayers)[currentPlayerIndex]?.team_colors || ['#FFFFFF', '#FFFFFF', '#FFFFFF'];
    return currentTeamColors;
  };

  const [primaryColor, secondaryColor, tertiaryColor] = getCurrentTeamColors();

  const handleSubmit = () => {
    const correctCount = evaluateInputs();
    const allFilled = currentStats.every(stat => statValues[stat] !== undefined && statValues[stat] !== '');

    if (allFilled) {
      const playerData = Object.values(data.usedPlayers)[currentPlayerIndex]?.player_data;
      if (!playerData) {
        console.error("Missing player data on submit.");
        return;
      }
      setTimeout(() => {
        const playerName = Object.values(data.usedPlayers)[currentPlayerIndex]?.player_name;

        setCompletedQuestions(prev => [...prev, currentPlayerIndex]);

        setResults(prevResults => [...prevResults, {
          playerName,
          playerImage: Object.values(data.usedPlayers)[currentPlayerIndex]?.player_img,
          playerScore: correctCount,
          playerStats: currentStats.map(stat => ({
            stat,
            userValue: statValues[stat],
            correctValue: playerData[stat]
          })),
          teamColor: Object.values(data.usedPlayers)[currentPlayerIndex]?.team_colors[0],
          teamLogo: Object.values(data.usedPlayers)[currentPlayerIndex]?.team_logo
        }]);

        setScore(prevScore => prevScore + correctCount);  // Update score

        // Update question circles
        setQuestionCircles(prevCircles => {
          const newCircles = [...prevCircles];
          newCircles[currentPlayerIndex] = false; // Mark the current question as answered
          return newCircles;
        });

        if (completedQuestions.length >= 4) {
          setIsDone(true);
        } else {
          let nextIndex = (currentPlayerIndex + 1) % Object.keys(data.usedPlayers).length;
          while (completedQuestions.includes(nextIndex)) {
            nextIndex = (nextIndex + 1) % Object.keys(data.usedPlayers).length;
          }
          setCurrentPlayerIndex(nextIndex);
          resetInputFields();
        }
      }, 500);
    } else {
      const nextUnfilledStat = currentStats.find(stat => statValues[stat] === undefined || statValues[stat] === '');
      const nextUnfilledIndex = currentStats.indexOf(nextUnfilledStat);
      inputRefs.current[nextUnfilledIndex]?.focus();
    }
  };

  const handleContinue = (event) => {
    if (event.target === event.currentTarget) {
      setShowIntro(false);
    }
  };

  const handleNavTitleClick = () => {
    // Logic to navigate to the home screen
    window.location.reload(); // This will refresh the page, effectively taking the user to the home screen
  };

  const handleQuestion = () => { 
    setShowIntro(true); 
  }; 
  return (
    <div>
      <Helmet>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
        <link href="https://fonts.googleapis.com/css2?family=Roboto+Mono:ital,wght@0,100..700;1,100..700&display=swap" rel="stylesheet" />
      </Helmet>
      <nav className="navbar">
        <div className="navbar-title" style={{ cursor: 'pointer' }}>
          <p>Stat Wizard </p>
          <img className="name-img" src="https://www.prosportstickers.com/wp-content/uploads/2022/10/wizard-emoji.png" alt="Wizard Emoji" />
        </div>
        <button className="navbar-button" onClick={handleQuestion}>?</button>
      </nav>

      <div className={`fixed-quiz ${showIntro ? 'blurred' : ''}`}>
        <div className="player-container">
          {!isDone ? (
            <>
              <div className="score-container">
                {/* <div className="score-text">Questions Remaining</div> */}
                <div className="score-tracker">
                  {questionCircles.map((remaining, index) => (
                    <div key={index} className={`score-circle ${remaining ? '' : 'filled'}`}></div>
                  ))}
                </div>
              </div>
              <div className="player-card">
                <div className="player-card-header" style={{ backgroundColor: primaryColor, color: tertiaryColor, borderColor: 'black', borderWidth: '1px' }}>
                  {data.usedPlayers && Object.keys(data.usedPlayers).length > 0 && (
                    <>
                      <img className="player-img" src={Object.values(data.usedPlayers)[currentPlayerIndex]?.player_img || ''} alt="Player" />
                      <img className="team-logo" src={Object.values(data.usedPlayers)[currentPlayerIndex]?.team_logo || ''} alt="Team Logo" />
                      <div className="player-info">
                        <h2 className="player-name">{Object.values(data.usedPlayers)[currentPlayerIndex]?.player_name}</h2>
                        <p className="add-playerInfo">{Object.values(data.usedPlayers)[currentPlayerIndex]?.team_name} | {Object.values(data.usedPlayers)[currentPlayerIndex]?.jersey_number} | {Object.values(data.usedPlayers)[currentPlayerIndex]?.position}</p>
                      </div>
                      <div className="game-matchup-container">
                        <div className="game-date">
                          <h1 className="game-date">{Object.values(data.usedPlayers)[currentPlayerIndex]?.game_date}</h1>
                        </div>
                        <div className="game-score">
                          <h1 className="game-score">{Object.values(data.usedPlayers)[currentPlayerIndex]?.team_points[Object.keys(data.usedPlayers)[currentPlayerIndex].split(" ")[0]]}</h1>
                          <h1 className="game-score">{Object.values(data.usedPlayers)[currentPlayerIndex]?.team_points[Object.keys(data.usedPlayers)[currentPlayerIndex].split(" ")[2]]}</h1>
                        </div>
                        <div className="game-logo-matchup">
                          <img className="game-team-logo" src={Object.values(data.usedPlayers)[currentPlayerIndex]?.team1_logo || ''} alt="Team 1 Logo" />
                          <p className="game-matchup">{Object.values(data.usedPlayers)[currentPlayerIndex]?.matchup}</p>
                          <img className="game-team-logo" src={Object.values(data.usedPlayers)[currentPlayerIndex]?.team2_logo || ''} alt="Team 2 Logo" />
                        </div>
                      </div>
                    </>
                  )}
                </div>
                <div className="stat-container">
                  <div className="grid-container">
                    {currentStats.map((stat, index) => (
                      <div key={stat} className={`grid-item`}>
                        <input
                          type="text"
                          placeholder={statValues[stat] ? '' : stat}
                          value={statValues[stat] || ''}
                          onChange={(event) => handleInputChange(event, stat)}
                          onKeyDown={handleKeyDown}
                          onFocus={(event) => event.target.placeholder = ''}
                          onBlur={(event) => event.target.placeholder = statValues[stat] ? '' : stat}
                          ref={(el) => (inputRefs.current[index] = el)}
                          disabled={feedbackClasses[stat] !== undefined}
                          style={{ backgroundColor: feedbackClasses[stat] === 'correct' ? 'green' : feedbackClasses[stat] === 'incorrect' ? '#fd5c63' : '' }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="button-container">
                  <button className="submit-button" id="button" onClick={handleSubmit}
                    style={{ color: 'white' }}
                  >
                    Submit<img className="submit-img" src="https://em-content.zobj.net/source/apple/118/basketball-and-hoop_1f3c0.png" alt="Submit Icon"></img>
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className='loading-container'>
              <div className="results-top-container">
                <div className="results-title-container">
                  <h2 className="results-title">Score: {score}/{getMaxScore()}</h2>
                </div>
              </div>
              <div className="results-container">
                {results.map((result, index) => (
                  <div key={index} className="result-item" style={{ backgroundColor: result.teamColor }}>
                    <img className="result-player-img" src={result.playerImage} alt={`${result.playerName}`} />
                    <img className="result-team-logo" src={result.teamLogo} alt="team-logo" />
                    <div className="result-player-info">
                      <h3 className="result-player-name">{result.playerName}</h3>
                      <p>Score: {result.playerScore}</p>
                      <ul>
                        {result.playerStats.map((stat, statIndex) => (
                          <li key={statIndex}>
                            {stat.stat}: {stat.userValue} / {stat.correctValue}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {showIntro && (
        <div className="intro-overlay" onClick={handleContinue}>
          <div className="intro-card">
            <button className="continue-button" onClick={() => setShowIntro(false)}>X</button>
            <h2>Welcome to Stat Wizard!</h2>
            <p>Test your knowledge by guessing the stats of NBA players based on their recent game performance.</p>
            <h2>Rules:</h2>
            <ul>
              <li id="intro-li">Guess the points (PTS), assists (AST), blocks (BLK), steals (STL), Turnovers (TOV), and rebounds (REB), of each player.</li>
              <li id="intro-li">Enter your guesses in the input fields provided.</li>
              <li id="intro-li">Click "Submit" to check your answers.</li>
              <li id="intro-li">Your score will be displayed at the end of the quiz.</li>
            </ul>
            <h2>Examples</h2>
            <img className="example" src={`${process.env.PUBLIC_URL}/Stat_correct.png`} alt="example" />
            <p>Green symbolizes a correct answer</p>
            <img className="example" src={`${process.env.PUBLIC_URL}/Stat_Incorrect.png`} alt="example" />
            <p>Red symbolizes an incorrect answer</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
