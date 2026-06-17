import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import HomePage from './pages/HomePage'
import ImportPage from './pages/ImportPage'
import LearnPage from './pages/LearnPage'
import ReviewPage from './pages/ReviewPage'
import StatsPage from './pages/StatsPage'
import WordListPage from './pages/WordListPage'
import ReportPage from './pages/ReportPage'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/import" element={<ImportPage />} />
        <Route path="/learn" element={<LearnPage />} />
        <Route path="/review" element={<ReviewPage />} />
        <Route path="/stats" element={<StatsPage />} />
        <Route path="/words/:stage" element={<WordListPage />} />
        <Route path="/report" element={<ReportPage />} />
      </Route>
    </Routes>
  )
}
