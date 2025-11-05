// components/PlantLayout.jsx
import modelImage from '../assets/model.png'

export default function PlantLayout({ children, width = 1500, height = 700 }) {
    return (
        <div
            className="page-center"
            style={{
                // marginTop: 100,           // space under fixed navbar
                display: 'flex',
                justifyContent: 'center'
            }}
        >
            <div
                style={{
                    width,
                    height,
                    position: 'relative',
                    backgroundImage: `url(${modelImage})`,
                    backgroundSize: `${width}px`,
                    backgroundRepeat: 'no-repeat'
                }}
            >
                {children}
            </div>
        </div>
    )
}
