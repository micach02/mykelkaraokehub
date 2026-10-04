import { EmptyState } from '../components/common/EmptyState'
import { ButtonLink } from '../components/common/Button'
import { useDocumentTitle } from '../hooks/useDocumentTitle'

export default function NotFound() {
  useDocumentTitle('Page not found')
  return (
    <div className="page">
      <EmptyState
        icon="🎶"
        title="Wrong key!"
        description="We couldn't find that page."
        action={<ButtonLink to="/" variant="primary">Back to myKelKaraokeHub</ButtonLink>}
      />
    </div>
  )
}
