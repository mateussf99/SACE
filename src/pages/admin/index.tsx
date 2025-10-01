import FormsAreas from '@/components/formsAreas'
import FormsUser from '@/components/formsUser'
import FormsDenuncia from '@/components/formsDenuncia'

function index() {
  return (
    <div className='bg-secondary h-full mt-2 flex gap-4'>
      <FormsAreas />
      <FormsUser />
      <FormsDenuncia />
    </div>
  )
}

export default index