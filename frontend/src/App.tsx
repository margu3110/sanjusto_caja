import {
  Admin,
  Resource,
  CustomRoutes,
} from "react-admin";

import { Route } from "react-router-dom";

import Dashboard from "./dashboard/Dashboard";
import CajaPage from "./caja/CajaPage";

import dataProvider from "./dataProvider";
import { authProvider } from "./authProvider";

import {
  CustomerList,
  CustomerEdit,
  CustomerCreate,
} from "./customers/customers";

import {
  CategoryList,
  CategoryEdit,
  CategoryCreate,
} from "./categories/categories";

import { Layout, Menu } from "react-admin";
import { MenuItemLink } from "react-admin";
import PointOfSaleIcon from "@mui/icons-material/PointOfSale";


const MyMenu = () => (
  <Menu>
    <Menu.DashboardItem label="Inicio" />
    <Menu.ResourceItems />
    
    <MenuItemLink
      to="/caja"
      primaryText="Programa de Caja"
      leftIcon={<PointOfSaleIcon />}
    />
  </Menu>
);

const MyLayout = (props: any) => (
  <Layout {...props} menu={MyMenu} />
);



export default function App() {
  return (
    <Admin
      dataProvider={dataProvider}
      authProvider={authProvider}
      dashboard={Dashboard}
      layout={MyLayout}
    >
      <Resource
        name="customers"
        options={{ label: "Contribuyentes" }}
        list={CustomerList}
        edit={CustomerEdit}
        create={CustomerCreate}
      />

      <Resource
        name="categories"
        options={{ label: "Categorías" }}
        list={CategoryList}
        edit={CategoryEdit}
        create={CategoryCreate}
      />

      <CustomRoutes>
        <Route path="/caja" element={<CajaPage />} />
      </CustomRoutes>
    </Admin>
  );
}