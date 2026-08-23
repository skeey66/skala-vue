import { defineStore } from 'pinia'

/**
 * 찜한 야영장.
 *
 * 찜은 야영장 단위다. "강원도를 찜한다" 는 말은 잘 안 쓰고,
 * 가고 싶은 캠핑장을 담아 뒀다가 나중에 예약한다.
 *
 * 야영장은 고캠핑 API 에서 오므로 id 만 저장하면 찜 화면을 열 때마다
 * 전국 목록을 다시 받아야 한다. 그래서 화면에 필요한 만큼만 잘라 함께 저장한다.
 * 새로고침해도 남도록 localStorage 에 둔다.
 */
const STORAGE_KEY = 'skala-vue:favorites:camps'

// 찜 목록을 그리는 데 필요한 것만. 야영장 하나가 30개 필드짜리라 통째로 담지 않는다.
function trim(camp) {
  return {
    id: camp.id,
    name: camp.name,
    district: camp.district ?? '',
    address: camp.address ?? '',
    image: camp.image ?? '',
    thumb: camp.thumb ?? '',
    type: camp.type ?? '',
    types: camp.types ?? [],
    terrain: camp.terrain ?? [],
    brazier: camp.brazier ?? '',
    intro: camp.intro ?? '',
    tel: camp.tel ?? '',
    homepage: camp.homepage ?? '',
    reserve: camp.reserve ?? { type: '', url: '' },
    savedAt: Date.now(),
  }
}

function loadFromStorage() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY))
    return Array.isArray(saved) ? saved.filter((camp) => camp?.id && camp?.name) : []
  } catch {
    return []
  }
}

export const useFavoriteStore = defineStore('favorite', {
  state: () => ({
    camps: loadFromStorage(),
  }),

  getters: {
    count: (state) => state.camps.length,
    // 인자를 받는 getter (이 야영장이 찜인지)
    isFavorite: (state) => (campId) => state.camps.some((camp) => camp.id === campId),
    // 나중에 담은 것이 위로
    recent: (state) => [...state.camps].sort((a, b) => (b.savedAt ?? 0) - (a.savedAt ?? 0)),
  },

  actions: {
    toggle(camp) {
      if (!camp?.id) return
      this.camps = this.isFavorite(camp.id)
        ? this.camps.filter((item) => item.id !== camp.id)
        : [...this.camps, trim(camp)]
      this.save()
    },

    remove(campId) {
      this.camps = this.camps.filter((camp) => camp.id !== campId)
      this.save()
    },

    clear() {
      this.camps = []
      this.save()
    },

    save() {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.camps))
    },
  },
})
