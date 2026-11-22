import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { useServiciosConductor } from '../useServiciosConductor';
import { AuthContext } from '../../context/Authcontext';
import * as servicioService from '../../services/servicioService';

jest.mock('../../services/servicioService', () => ({ misServicios: jest.fn() }));

const user = { dni: 12345678, nombre: 'Ana', unidad: 'U-01' };

const wrapper = ({ children }) => (
    <AuthContext.Provider value={{ user, login: jest.fn(), logout: jest.fn(), loading: false }}>
        {children}
    </AuthContext.Provider>
);

describe('useServiciosConductor', () => {
    it('shows every ride the backend returns for the authenticated driver', async () => {
        // The backend already filters by the driver in the token, so names and
        // units in the rows are not compared on the phone.
        const contenido = [
            { fecha: '2026-11-21', puntoPartida: 'A', puntoDestino: 'B', precio: 10, nombreConductor: 'ANA PEREZ', unidad: 'U-02' },
            { fecha: '2026-11-20', puntoPartida: 'C', puntoDestino: 'D', precio: 12 },
        ];
        servicioService.misServicios.mockResolvedValue({ contenido });
        const onLoaded = jest.fn();

        const { result } = renderHook(() => useServiciosConductor(onLoaded), { wrapper });

        await waitFor(() => expect(result.current).toEqual(contenido));
        expect(onLoaded).toHaveBeenCalledWith(contenido);
        expect(servicioService.misServicios).toHaveBeenCalledWith({ page: 0, size: 100 });
    });
});
