using System;
using System.Threading;
using System.Web;
using Weavy.Core;
using Weavy.Core.Helpers;

namespace Wvy {

    public class Global : System.Web.HttpApplication {

        /// <summary>
        /// Start up Weavy on application start.
        /// </summary>
        protected void Application_Start() {
            Bootstrapper.Startup();
        }

        /// <summary>
        /// Shut down Weavy to free up some resources.
        /// </summary>
        protected void Application_End() {
            Bootstrapper.Shutdown();
        }

        /// <summary>
        /// Set preferred culture based on Accept-Language header. 
        /// </summary>
        /// <param name="sender"></param>
        /// <param name="e"></param>
        protected void Application_BeginRequest(object sender, EventArgs e) {
            if (sender is HttpApplication app && app.Context?.Request?.Headers != null) {
                Thread.CurrentThread.CurrentCulture = CultureHelper.GetCultureFromHeader(app.Context.Request.Headers["Accept-Language"]) ?? Thread.CurrentThread.CurrentCulture;
            }
        }

        /// <summary>
        /// Remove some HTTP Headers for a little extra security (by obscurity).
        /// </summary>
        /// <param name="sender"></param>
        /// <param name="e"></param>
        protected void Application_PreSendRequestHeaders(object sender, EventArgs e) {
            if (sender is HttpApplication app && app.Context?.Response?.Headers != null) {
                // remove the "Server" HTTP Header added by ASP.NET
                app.Context.Response.Headers.Remove("Server");
                // remove the "X-Engine" HTTP Header added by the WebDAV Engine
                app.Context.Response.Headers.Remove("X-Engine");
            }
        }
    }
}
