import { Link } from 'react-router-dom'
import { Icon } from '../common/Icon'
import { isCategoryVisible } from '../../services/songService'
import { pluralize } from '../../utils/text'
import { cx } from '../../utils/classNames'

export function CategoryTiles({ categories, compact = false }) {
  return (
    <ul className={cx('category-grid', compact && 'category-grid--compact')}>
      {categories.filter(isCategoryVisible).map((category) => (
        <li key={category.id}>
          <Link to={`/categories/${category.id}`} className={cx('category-tile', category.featured && 'category-tile--featured')}>
            <Icon symbol={category.icon} className="category-tile__icon" />
            <span className="category-tile__label">{category.label}</span>
            {category.songCount != null && <span className="category-tile__count">{pluralize(category.songCount, 'song')}</span>}
            {!compact && <span className="category-tile__desc">{category.description}</span>}
          </Link>
        </li>
      ))}
    </ul>
  )
}
