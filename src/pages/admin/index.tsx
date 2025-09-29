import FormsAreas from '@/components/formsAreas'
import FormsUser from '@/components/formsUser'

function index() {
  return (
    <div className=' mt-2 flex gap-4'>
      <FormsAreas />
      <FormsUser />
    </div>
  )
}

export default index