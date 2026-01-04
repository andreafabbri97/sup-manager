import React, { useEffect, useState } from 'react'
import Card from './ui/Card'

type WeatherData = {
  temp: number
  description: string
  icon: string
  humidity: number
  windSpeed: number
  forecast: {
    date: string
    temp: number
    icon: string
    description: string
  }[]
}

export default function WeatherWidget({ lat = 41.9028, lon = 12.4964 }: { lat?: number; lon?: number }) {
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadWeather()
  }, [lat, lon])

  async function loadWeather() {
    setLoading(true)
    setError(null)

    // OpenWeatherMap API - FREE tier (richiede API key)
    // Per usare: registrarsi su https://openweathermap.org/api
    // e sostituire YOUR_API_KEY con la propria chiave
    const API_KEY = 'YOUR_API_KEY'
    
    if (API_KEY === 'YOUR_API_KEY') {
      setError('Configura API key OpenWeatherMap')
      setLoading(false)
      return
    }

    try {
      // Current weather
      const currentRes = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&lang=it&appid=${API_KEY}`
      )
      if (!currentRes.ok) throw new Error('Errore caricamento meteo')
      const currentData = await currentRes.json()

      // Forecast 5 days
      const forecastRes = await fetch(
        `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&lang=it&appid=${API_KEY}`
      )
      if (!forecastRes.ok) throw new Error('Errore caricamento previsioni')
      const forecastData = await forecastRes.json()

      // Prendi una previsione per giorno (ore 12:00)
      const dailyForecast = forecastData.list
        .filter((item: any) => item.dt_txt.includes('12:00:00'))
        .slice(0, 5)
        .map((item: any) => ({
          date: new Date(item.dt * 1000).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric' }),
          temp: Math.round(item.main.temp),
          icon: item.weather[0].icon,
          description: item.weather[0].description,
        }))

      setWeather({
        temp: Math.round(currentData.main.temp),
        description: currentData.weather[0].description,
        icon: currentData.weather[0].icon,
        humidity: currentData.main.humidity,
        windSpeed: Math.round(currentData.wind.speed * 3.6), // m/s to km/h
        forecast: dailyForecast,
      })
    } catch (err: any) {
      setError(err.message || 'Errore caricamento meteo')
    }
    setLoading(false)
  }

  if (loading) {
    return (
      <Card>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
        </div>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <div className="text-center py-4">
          <svg className="w-12 h-12 mx-auto text-neutral-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
          </svg>
          <p className="text-sm text-neutral-500">{error}</p>
          <button onClick={loadWeather} className="mt-2 text-xs text-blue-600 hover:underline">
            Riprova
          </button>
        </div>
      </Card>
    )
  }

  if (!weather) return null

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium text-lg">Meteo</h3>
        <button onClick={loadWeather} className="text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {/* Current weather */}
      <div className="flex items-center gap-4 mb-6 pb-6 border-b border-neutral-200 dark:border-neutral-700">
        <img
          src={`https://openweathermap.org/img/wn/${weather.icon}@2x.png`}
          alt={weather.description}
          className="w-20 h-20"
        />
        <div className="flex-1">
          <div className="text-4xl font-bold">{weather.temp}°C</div>
          <div className="text-sm text-neutral-600 dark:text-neutral-400 capitalize">
            {weather.description}
          </div>
          <div className="flex gap-4 mt-2 text-xs text-neutral-500">
            <div className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
              <span>Umidità {weather.humidity}%</span>
            </div>
            <div className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
              <span>Vento {weather.windSpeed} km/h</span>
            </div>
          </div>
        </div>
      </div>

      {/* Forecast */}
      <div>
        <h4 className="text-sm font-medium mb-3">Previsioni</h4>
        <div className="grid grid-cols-5 gap-2">
          {weather.forecast.map((day, idx) => (
            <div key={idx} className="text-center">
              <div className="text-xs text-neutral-500 mb-1">{day.date}</div>
              <img
                src={`https://openweathermap.org/img/wn/${day.icon}.png`}
                alt={day.description}
                className="w-10 h-10 mx-auto"
              />
              <div className="text-sm font-semibold">{day.temp}°</div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}
