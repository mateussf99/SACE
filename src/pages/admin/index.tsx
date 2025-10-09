import FormsAreas from '@/components/formsAreas'
import FormsUser from '@/components/formsUser'
import FormsDenuncia from '@/components/formsDenuncia'
import FormsArtigos from '@/components/formsArtigos'

function index() {
  return (
    <div className='bg-secondary h-full mt-2 flex gap-4'>
      <div className='w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4'>
        <FormsAreas />
        <FormsUser />
        <FormsDenuncia />
        <FormsArtigos />
      </div>
    </div>
  )
}

export default index