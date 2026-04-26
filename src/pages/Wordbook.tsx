import { posOptions } from './wordbook/wordbookHelpers'
import { ListPane } from './wordbook/components/ListPane'
import { DetailHeader, DetailView } from './wordbook/components/DetailView'
import { DetailEdit } from './wordbook/components/DetailEdit'
import { useWordbookController } from './wordbook/useWordbookController'

export function Wordbook() {
  const c = useWordbookController()

  return (
    <section className="page">
      <h2>単語帳</h2>
      <div className={c.layout.isMobile ? 'splitMobile' : 'split'}>
        {(!c.layout.isMobile || !c.selection.selected) && (
          <ListPane {...c.list} />
        )}

        {(!c.layout.isMobile || c.selection.selected) && (
          <div className="card">
            <div className="row wrap">
            </div>
          {c.selection.selected ? (
            <div className="detail">
              <DetailHeader selected={c.selection.selected} />

              {c.mode.isEditing ? (
                <DetailEdit
                  {...c.edit}
                  posOptions={posOptions}
                />
              ) : (
                <DetailView
                  {...c.detailViewProps!}
                />
              )}
            </div>
          ) : (
            <p className="subtle">左から単語を選択してください。</p>
          )}
          </div>
        )}
      </div>
    </section>
  )
}

