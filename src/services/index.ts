import events from './events/routes';
import authentication from './authentication/routes'


export default [
    ...events,
    ...authentication
   
]