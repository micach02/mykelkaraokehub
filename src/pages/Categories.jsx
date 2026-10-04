import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { SongGrid } from '../components/songs/SongGrid'
import { CategoryTabs } from '../components/songs/CategoryTabs'
import { CategoryTiles } from '../components/songs/CategoryTiles'
import { SearchBar } from '../components/songs/SearchBar'
import { YouTubeResults } from '../components/songs/YouTubeResults'
import { EmptyState } from '../components/common/EmptyState'
import { ButtonLink } from '../components/common/Button'
import { Icon } from '../components/common/Icon'
import { useCategories, useSavedSongs } from '../hooks/useSongs'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { SEARCH_CONFIG } from '../config/appConfig'
import { pluralize } from '../utils/text'
import { cx } from '../utils/classNames'

export default function Categories() {
  const { categoryId } = useParams()
  return categoryId ? <CategoryDetail key={categoryId} categoryId={categoryId} /> : <CategoryIndex />
}

function CategoryIndex() {
  useDocumentTitle('Categories')
  const { categories } = useCategories()

  return (
    <div className="page">
      <section className="page-banner">
        <p className="eyebrow">Browse</p>
        <h1 className="page-banner__title">Categories</h1>
        <p className="page-banner__text">Find the perfect song for the moment. Every song is a karaoke video from YouTube.</p>
      </section>
      <CategoryTiles categories={categories} />
    </div>
  )
}

function SavedSongs() {
  const [query, setQuery] = useState('')
  const debounced = useDebouncedValue(query.trim(), SEARCH_CONFIG.debounceMs)
  const songs = useSavedSongs(debounced)
  const total = useSavedSongs('').length

  if (total === 0) {
    return (
      <EmptyState
        icon="⭐"
        title="No saved songs yet"
        description="Search for a song, then tap ☆ on a result to keep it here."
        action={<ButtonLink to="/" variant="primary">Find songs</ButtonLink>}
      />
    )
  }
  return (
    <>
      <div className="section__header">
        <h2 className="section__title">
          Saved songs <span className="section__count">{pluralize(songs.length, 'song')}</span>
        </h2>
        <SearchBar value={query} onChange={setQuery} size="sm" placeholder="Search My Songs…" label="Search My Songs" className="section__search" />
      </div>
      <SongGrid
        songs={songs}
        label="My Songs"
        empty={<EmptyState icon="🔎" compact title="No matching songs" description="Try a different search." />}
      />
    </>
  )
}

function CategoryDetail({ categoryId }) {
  const navigate = useNavigate()
  const { categories } = useCategories()
  const category = categories.find((c) => c.id === categoryId)
  useDocumentTitle(category?.label ?? 'Categories')

  if (!category) {
    return (
      <div className="page">
        <EmptyState
          icon="🗂️"
          title="Category not found"
          description="That category doesn't exist (yet)."
          action={<ButtonLink to="/categories" variant="primary">See all categories</ButtonLink>}
        />
      </div>
    )
  }

  return (
    <div className="page">
      <section className={cx('page-banner', category.featured && 'page-banner--opm')}>
        <p className="eyebrow"><Link to="/categories">Categories</Link> / {category.label}</p>
        <h1 className="page-banner__title">
          <Icon symbol={category.icon} /> {category.label}
        </h1>
        <p className="page-banner__text">{category.description}</p>
      </section>

      <section className="section" aria-label={`${category.label} songs`}>
        <CategoryTabs
          categories={categories}
          activeId={categoryId}
          onChange={(id) => navigate(id ? `/categories/${id}` : '/categories')}
          allLabel={null}
          label="Switch category"
        />
        {category.kind === 'saved' ? (
          <SavedSongs />
        ) : (
          // Opening a category counts as asking for the search. The server
          // caches it, so it costs at most one YouTube search per week.
          <YouTubeResults query={category.query} mode="full" title="Karaoke songs" />
        )}
      </section>
    </div>
  )
}
